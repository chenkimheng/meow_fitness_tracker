import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Dumbbell, UtensilsCrossed, Flame, TrendingUp, Calendar, X, Scale, Droplet, Camera } from "lucide-react";

const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner"];
const CUP_ML = 250;
const ML_PER_KG = 33; // 30–35 ml/kg is the standard guideline; we use 33

function calculateWaterGoal(weightKg) {
  if (!weightKg || weightKg <= 0) return 2000;
  return Math.round((weightKg * ML_PER_KG) / 250) * 250;
}

// localStorage helpers (replaces storage from the chat artifact)
const storage = {
  get(key) {
    return new Promise((resolve, reject) => {
      try {
        const v = localStorage.getItem(key);
        resolve(v ? { key, value: v } : null);
      } catch (e) { reject(e); }
    });
  },
  set(key, value) {
    return new Promise((resolve, reject) => {
      try { localStorage.setItem(key, value); resolve(true); }
      catch (e) { console.error("Storage error:", e); reject(e); }
    });
  },
  delete(key) {
    return new Promise((resolve) => {
      try { localStorage.removeItem(key); resolve(true); }
      catch { resolve(false); }
    });
  },
  list(prefix) {
    return new Promise((resolve) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      resolve({ keys });
    });
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [weights, setWeights] = useState([]);
  const [waterByDate, setWaterByDate] = useState({});
  const [profile, setProfile] = useState({ bodyWeightKg: null, waterGoalOverride: null });
  const [loading, setLoading] = useState(true);

  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [workoutForm, setWorkoutForm] = useState({ exercise: "", duration: "", calories: "", notes: "" });
  const [mealForm, setMealForm] = useState({ name: "", type: "Breakfast", calories: "", protein: "", notes: "", photo: null });
  const [weightForm, setWeightForm] = useState({ value: "", unit: "kg", notes: "" });
  const [profileForm, setProfileForm] = useState({ bodyWeightKg: "", waterGoalOverride: "" });

  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [wRes, mRes, wtRes, watRes, profRes] = await Promise.all([
        storage.list("workout:").catch(() => ({ keys: [] })),
        storage.list("meal:").catch(() => ({ keys: [] })),
        storage.list("weight:").catch(() => ({ keys: [] })),
        storage.list("water:").catch(() => ({ keys: [] })),
        storage.get("profile:main").catch(() => null),
      ]);

      const fetchAll = async (keys) => {
        return (await Promise.all(
          (keys || []).map(async (k) => {
            try { const r = await storage.get(k); return r ? JSON.parse(r.value) : null; }
            catch { return null; }
          })
        )).filter(Boolean);
      };

      const [wData, mData, wtData, watData] = await Promise.all([
        fetchAll(wRes?.keys), fetchAll(mRes?.keys), fetchAll(wtRes?.keys), fetchAll(watRes?.keys),
      ]);

      setWorkouts(wData);
      setMeals(mData);
      setWeights(wtData.sort((a, b) => a.date.localeCompare(b.date)));
      const wmap = {};
      watData.forEach((w) => { wmap[w.date] = w.cups || 0; });
      setWaterByDate(wmap);
      if (profRes) {
        try { setProfile(JSON.parse(profRes.value)); } catch {}
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveProfile() {
    const bw = parseFloat(profileForm.bodyWeightKg);
    const override = parseFloat(profileForm.waterGoalOverride);
    const next = {
      bodyWeightKg: !isNaN(bw) && bw > 0 ? bw : null,
      waterGoalOverride: !isNaN(override) && override > 0 ? override : null,
    };
    try {
      await storage.set("profile:main", JSON.stringify(next));
      setProfile(next);
      setShowProfileForm(false);
    } catch (e) { console.error(e); }
  }

  async function addWorkout() {
    if (!workoutForm.exercise.trim()) return;
    const entry = {
      id: `w_${Date.now()}`, date: selectedDate,
      exercise: workoutForm.exercise,
      duration: parseInt(workoutForm.duration) || 0,
      calories: parseInt(workoutForm.calories) || 0,
      notes: workoutForm.notes, createdAt: Date.now(),
    };
    try {
      await storage.set(`workout:${entry.id}`, JSON.stringify(entry));
      setWorkouts([...workouts, entry]);
      setWorkoutForm({ exercise: "", duration: "", calories: "", notes: "" });
      setShowWorkoutForm(false);
    } catch (e) { console.error(e); }
  }

  async function addMeal() {
    if (!mealForm.name.trim()) return;
    const entry = {
      id: `m_${Date.now()}`, date: selectedDate,
      name: mealForm.name, type: mealForm.type,
      calories: parseInt(mealForm.calories) || 0,
      protein: parseInt(mealForm.protein) || 0,
      notes: mealForm.notes, photo: mealForm.photo,
      createdAt: Date.now(),
    };
    try {
      await storage.set(`meal:${entry.id}`, JSON.stringify(entry));
      setMeals([...meals, entry]);
      setMealForm({ name: "", type: "Breakfast", calories: "", protein: "", notes: "", photo: null });
      setShowMealForm(false);
    } catch (e) {
      console.error(e);
      alert("Could not save — photo may be too large. Try a smaller image.");
    }
  }

  async function addWeight() {
    if (!weightForm.value) return;
    const val = parseFloat(weightForm.value);
    if (isNaN(val)) return;
    const entry = {
      id: `wt_${selectedDate}`, date: selectedDate,
      value: val, unit: weightForm.unit,
      notes: weightForm.notes, createdAt: Date.now(),
    };
    try {
      await storage.set(`weight:${entry.id}`, JSON.stringify(entry));
      const others = weights.filter((w) => w.date !== selectedDate);
      setWeights([...others, entry].sort((a, b) => a.date.localeCompare(b.date)));
      setWeightForm({ value: "", unit: "kg", notes: "" });
      setShowWeightForm(false);
    } catch (e) { console.error(e); }
  }

  async function deleteWorkout(id) {
    try { await storage.delete(`workout:${id}`); setWorkouts(workouts.filter((w) => w.id !== id)); }
    catch (e) { console.error(e); }
  }
  async function deleteMeal(id) {
    try { await storage.delete(`meal:${id}`); setMeals(meals.filter((m) => m.id !== id)); }
    catch (e) { console.error(e); }
  }
  async function deleteWeight(id) {
    try { await storage.delete(`weight:${id}`); setWeights(weights.filter((w) => w.id !== id)); }
    catch (e) { console.error(e); }
  }

  async function updateWater(newCups) {
    const cups = Math.max(0, Math.min(20, newCups));
    try {
      await storage.set(`water:${selectedDate}`, JSON.stringify({ date: selectedDate, cups }));
      setWaterByDate({ ...waterByDate, [selectedDate]: cups });
    } catch (e) { console.error(e); }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please choose an image."); return; }
    if (file.size > 4 * 1024 * 1024) { alert("Image too large. Please use one under 4 MB."); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setMealForm((f) => ({ ...f, photo: dataUrl }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  const todayWorkouts = workouts.filter((w) => w.date === selectedDate);
  const todayMeals = meals.filter((m) => m.date === selectedDate);
  const todayWeight = weights.find((w) => w.date === selectedDate);
  const todayWaterCups = waterByDate[selectedDate] || 0;
  const todayWaterMl = todayWaterCups * CUP_ML;

  // Personalized water goal: override > calculated from body weight > default 2000
  const waterGoalMl = profile.waterGoalOverride
    || calculateWaterGoal(profile.bodyWeightKg)
    || 2000;
  const cupsToShow = Math.max(8, Math.ceil(waterGoalMl / CUP_ML));

  const burned = todayWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
  const consumed = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const protein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const minutes = todayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
  const net = consumed - burned;

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    return {
      date: ds,
      label: d.toLocaleDateString("en", { weekday: "short" }).toUpperCase(),
      day: d.getDate(),
      burned: workouts.filter((w) => w.date === ds).reduce((s, w) => s + (w.calories || 0), 0),
      consumed: meals.filter((m) => m.date === ds).reduce((s, m) => s + (m.calories || 0), 0),
      minutes: workouts.filter((w) => w.date === ds).reduce((s, w) => s + (w.duration || 0), 0),
      water: (waterByDate[ds] || 0) * CUP_ML,
    };
  });
  const maxBar = Math.max(...last7.map((d) => Math.max(d.burned, d.consumed)), 100);

  const recentWeights = weights.slice(-30);
  const weightUnit = todayWeight?.unit || recentWeights[recentWeights.length - 1]?.unit || "kg";
  const wValues = recentWeights.map((w) => w.value);
  const wMin = wValues.length ? Math.min(...wValues) : 0;
  const wMax = wValues.length ? Math.max(...wValues) : 0;
  const wRange = wMax - wMin || 1;

  const todayLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <header className="border-b-4 border-stone-900 bg-stone-50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-stone-500 mb-1" style={{ fontFamily: "ui-monospace, monospace" }}>
                EST. {new Date().getFullYear()} · VOL. I
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none italic">
                The Training Ledger
              </h1>
            </div>
            <div className="text-right text-[10px] tracking-[0.2em] text-stone-600" style={{ fontFamily: "ui-monospace, monospace" }}>
              <div>A DAILY RECORD OF</div>
              <div>EFFORT & APPETITE</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-stone-700" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-b-2 border-stone-900 text-base font-bold tracking-tight focus:outline-none px-1 py-0.5"
              style={{ fontFamily: "ui-monospace, monospace" }}
            />
          </div>
          <div className="flex gap-1 border-2 border-stone-900 p-0.5">
            {["today", "history"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-xs tracking-[0.2em] font-bold transition-colors ${
                  activeTab === t ? "bg-stone-900 text-stone-50" : "text-stone-900 hover:bg-stone-200"
                }`}
                style={{ fontFamily: "ui-monospace, monospace" }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-400 italic">Loading your ledger…</div>
        ) : activeTab === "today" ? (
          <>
            <div className="text-sm italic text-stone-600 mb-4 border-b border-stone-300 pb-2">
              {todayLabel}
            </div>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-3 border-2 border-stone-900">
              <StatBlock label="CONSUMED" value={consumed} unit="kcal" icon={<UtensilsCrossed size={14} />} />
              <StatBlock label="BURNED" value={burned} unit="kcal" icon={<Flame size={14} />} dark />
              <StatBlock label="NET" value={net} unit="kcal" icon={<TrendingUp size={14} />} />
              <StatBlock label="ACTIVE" value={minutes} unit="min" icon={<Dumbbell size={14} />} dark />
            </section>
            {protein > 0 && (
              <div className="text-xs tracking-[0.15em] text-stone-600 mb-6" style={{ fontFamily: "ui-monospace, monospace" }}>
                PROTEIN INTAKE — {protein}G
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border-2 border-stone-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-2">
                    <Scale size={16} />
                    <h3 className="text-xs tracking-[0.25em] font-bold" style={{ fontFamily: "ui-monospace, monospace" }}>
                      WEIGHT <span className="text-stone-400 normal-case font-normal italic">— optional</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (todayWeight) setWeightForm({ value: String(todayWeight.value), unit: todayWeight.unit, notes: todayWeight.notes || "" });
                      setShowWeightForm(true);
                    }}
                    className="bg-stone-900 text-stone-50 p-1.5 hover:bg-stone-700 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {todayWeight ? (
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tight">{todayWeight.value}</span>
                      <span className="text-sm text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>{todayWeight.unit}</span>
                    </div>
                    <button onClick={() => deleteWeight(todayWeight.id)} className="text-stone-400 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm italic text-stone-400">Not recorded today.</div>
                )}
              </div>

              <div className="border-2 border-stone-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-2">
                    <Droplet size={16} />
                    <h3 className="text-xs tracking-[0.25em] font-bold" style={{ fontFamily: "ui-monospace, monospace" }}>
                      WATER
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setProfileForm({
                        bodyWeightKg: profile.bodyWeightKg ? String(profile.bodyWeightKg) : "",
                        waterGoalOverride: profile.waterGoalOverride ? String(profile.waterGoalOverride) : "",
                      });
                      setShowProfileForm(true);
                    }}
                    className="text-[10px] tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors"
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  >
                    {todayWaterMl} / {waterGoalMl} ML →
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateWater(todayWaterCups - 1)}
                    disabled={todayWaterCups === 0}
                    className="w-9 h-9 border-2 border-stone-900 text-xl font-bold hover:bg-stone-900 hover:text-stone-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >−</button>
                  <div className="flex-1 flex gap-1 justify-center flex-wrap">
                    {[...Array(cupsToShow)].map((_, i) => (
                      <Droplet
                        key={i}
                        size={20}
                        className={i < todayWaterCups ? "fill-stone-900 text-stone-900" : "text-stone-300"}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => updateWater(todayWaterCups + 1)}
                    className="w-9 h-9 border-2 border-stone-900 bg-stone-900 text-stone-50 text-xl font-bold hover:bg-stone-700 transition-colors"
                  >+</button>
                </div>
                <div className="text-[10px] tracking-[0.15em] text-stone-500 mt-2 text-center" style={{ fontFamily: "ui-monospace, monospace" }}>
                  {todayWaterCups} CUP{todayWaterCups !== 1 ? "S" : ""} · {CUP_ML}ML EACH
                  {profile.bodyWeightKg && !profile.waterGoalOverride && (
                    <span> · GOAL FROM {profile.bodyWeightKg}KG</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <section>
                <SectionHead num="I" title="Training" icon={<Dumbbell size={18} />} onAdd={() => setShowWorkoutForm(true)} />
                {todayWorkouts.length === 0 ? (
                  <EmptyState text="No training logged. The body waits." />
                ) : (
                  <ul className="space-y-3">
                    {todayWorkouts.map((w) => (
                      <li key={w.id} className="border-b border-stone-300 pb-3 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg leading-tight">{w.exercise}</div>
                            <div className="text-xs tracking-[0.15em] text-stone-600 mt-1" style={{ fontFamily: "ui-monospace, monospace" }}>
                              {w.duration > 0 && `${w.duration} MIN`}
                              {w.duration > 0 && w.calories > 0 && " · "}
                              {w.calories > 0 && `${w.calories} KCAL`}
                            </div>
                            {w.notes && <div className="text-sm italic text-stone-600 mt-1">{w.notes}</div>}
                          </div>
                          <button onClick={() => deleteWorkout(w.id)} className="text-stone-400 hover:text-red-700">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between border-b-2 border-stone-900 pb-2 mb-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs italic text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>§ II</span>
                    <h2 className="text-2xl font-black italic flex items-center gap-2">
                      <UtensilsCrossed size={18} /> Sustenance
                    </h2>
                  </div>
                </div>
                <ul className="space-y-5">
                  {MEAL_SLOTS.map((slot) => {
                    const items = todayMeals.filter((m) => m.type === slot);
                    return (
                      <li key={slot}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] tracking-[0.3em] text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>
                            {slot.toUpperCase()}
                          </div>
                          <button
                            onClick={() => { setMealForm({ name: "", type: slot, calories: "", protein: "", notes: "", photo: null }); setShowMealForm(true); }}
                            className="text-[10px] tracking-[0.2em] font-bold text-stone-900 hover:bg-stone-900 hover:text-stone-50 px-2 py-0.5 border border-stone-900 transition-colors flex items-center gap-1"
                            style={{ fontFamily: "ui-monospace, monospace" }}
                          >
                            <Plus size={10} /> ADD
                          </button>
                        </div>
                        {items.length === 0 ? (
                          <div className="text-sm italic text-stone-400 border-b border-stone-200 pb-2">— nothing recorded —</div>
                        ) : (
                          <ul className="space-y-2">
                            {items.map((m) => (
                              <li key={m.id} className="border-b border-stone-300 pb-2 group">
                                <div className="flex items-start gap-3">
                                  {m.photo && (
                                    <button onClick={() => setPhotoPreview(m.photo)} className="shrink-0">
                                      <img src={m.photo} alt={m.name} className="w-14 h-14 object-cover border border-stone-900 hover:opacity-80 transition-opacity" />
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold leading-tight">{m.name}</div>
                                    <div className="text-xs tracking-[0.15em] text-stone-600 mt-1" style={{ fontFamily: "ui-monospace, monospace" }}>
                                      {m.calories > 0 && `${m.calories} KCAL`}
                                      {m.calories > 0 && m.protein > 0 && " · "}
                                      {m.protein > 0 && `${m.protein}G PROTEIN`}
                                    </div>
                                    {m.notes && <div className="text-sm italic text-stone-600 mt-1">{m.notes}</div>}
                                  </div>
                                  <button onClick={() => deleteMeal(m.id)} className="text-stone-400 hover:text-red-700">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </>
        ) : (
          <section>
            <div className="text-xs tracking-[0.3em] text-stone-500 mb-4" style={{ fontFamily: "ui-monospace, monospace" }}>
              THE LAST SEVEN DAYS — CONSUMED vs BURNED
            </div>
            <div className="border-2 border-stone-900 p-5 md:p-8 bg-white">
              <div className="grid grid-cols-7 gap-2 items-end" style={{ minHeight: "200px" }}>
                {last7.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: "160px" }}>
                      <div className="flex-1 bg-stone-300 transition-all" style={{ height: `${(d.consumed / maxBar) * 100}%`, minHeight: d.consumed > 0 ? "2px" : "0" }} />
                      <div className="flex-1 bg-stone-900 transition-all" style={{ height: `${(d.burned / maxBar) * 100}%`, minHeight: d.burned > 0 ? "2px" : "0" }} />
                    </div>
                    <div className="text-[9px] tracking-[0.15em] text-stone-500 mt-1" style={{ fontFamily: "ui-monospace, monospace" }}>
                      {d.label}
                    </div>
                    <div className="text-sm font-bold">{d.day}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-6 pt-4 border-t border-stone-300 text-[10px] tracking-[0.2em]" style={{ fontFamily: "ui-monospace, monospace" }}>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-stone-300" /> CONSUMED</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-stone-900" /> BURNED</div>
              </div>
            </div>

            <div className="mt-6 border-2 border-stone-900 p-5 md:p-6">
              <div className="text-xs tracking-[0.3em] text-stone-500 mb-4 flex items-center gap-2" style={{ fontFamily: "ui-monospace, monospace" }}>
                <Droplet size={12} /> WATER INTAKE — 7 DAYS
              </div>
              <div className="grid grid-cols-7 gap-2 items-end" style={{ minHeight: "100px" }}>
                {last7.map((d) => {
                  const pct = Math.min(100, (d.water / waterGoalMl) * 100);
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div className="w-full flex items-end" style={{ height: "70px" }}>
                        <div className="w-full bg-sky-700 transition-all" style={{ height: `${pct}%`, minHeight: d.water > 0 ? "2px" : "0" }} />
                      </div>
                      <div className="text-[9px] tracking-[0.15em] text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>
                        {d.label}
                      </div>
                      <div className="text-[10px] text-stone-600" style={{ fontFamily: "ui-monospace, monospace" }}>{d.water}ml</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {recentWeights.length > 0 && (
              <div className="mt-6 border-2 border-stone-900 p-5 md:p-6">
                <div className="text-xs tracking-[0.3em] text-stone-500 mb-4 flex items-center gap-2" style={{ fontFamily: "ui-monospace, monospace" }}>
                  <Scale size={12} /> WEIGHT TREND — LAST {recentWeights.length} ENTRIES ({weightUnit})
                </div>
                <div className="relative" style={{ height: "120px" }}>
                  <svg className="w-full h-full" viewBox={`0 0 ${Math.max(recentWeights.length * 20, 100)} 100`} preserveAspectRatio="none">
                    <polyline
                      fill="none" stroke="#1c1917" strokeWidth="2"
                      points={recentWeights.map((w, i) => `${i * 20 + 10},${100 - ((w.value - wMin) / wRange) * 80 - 10}`).join(" ")}
                    />
                    {recentWeights.map((w, i) => (
                      <circle key={w.id} cx={i * 20 + 10} cy={100 - ((w.value - wMin) / wRange) * 80 - 10} r="3" fill="#1c1917" />
                    ))}
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 mt-2" style={{ fontFamily: "ui-monospace, monospace" }}>
                  <span>MIN {wMin}</span>
                  <span>MAX {wMax}</span>
                  <span>LATEST {recentWeights[recentWeights.length - 1].value}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-6 border-2 border-stone-900">
              <StatBlock label="7D BURN" value={last7.reduce((s, d) => s + d.burned, 0)} unit="kcal" />
              <StatBlock label="7D INTAKE" value={last7.reduce((s, d) => s + d.consumed, 0)} unit="kcal" dark />
              <StatBlock label="7D ACTIVE" value={last7.reduce((s, d) => s + d.minutes, 0)} unit="min" />
              <StatBlock label="7D WATER" value={last7.reduce((s, d) => s + d.water, 0)} unit="ml" dark />
            </div>
          </section>
        )}
      </main>

      <footer className="border-t-2 border-stone-900 mt-12 py-5 px-5">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-[10px] tracking-[0.2em] text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>
          <div>— FIN —</div>
          <div>SAVED LOCALLY</div>
        </div>
      </footer>

      {photoPreview && (
        <div className="fixed inset-0 bg-stone-900/90 flex items-center justify-center p-4 z-50" onClick={() => setPhotoPreview(null)}>
          <img src={photoPreview} alt="Meal" className="max-w-full max-h-full object-contain border-2 border-stone-50" />
          <button onClick={() => setPhotoPreview(null)} className="absolute top-4 right-4 text-stone-50 hover:text-stone-300">
            <X size={28} />
          </button>
        </div>
      )}

      {showProfileForm && (
        <Modal onClose={() => setShowProfileForm(false)} title="WATER GOAL" num="◆">
          <div className="text-xs italic text-stone-600 leading-relaxed">
            The standard guideline is 30–35 ml of water per kilogram of body weight.
            Enter your weight and we'll calculate it — or set a custom goal directly.
          </div>
          <FormField label="Body weight (kg)">
            <input type="number" step="0.1" value={profileForm.bodyWeightKg}
              onChange={(e) => setProfileForm({ ...profileForm, bodyWeightKg: e.target.value })}
              placeholder="e.g. 64" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" autoFocus />
            {profileForm.bodyWeightKg && !isNaN(parseFloat(profileForm.bodyWeightKg)) && parseFloat(profileForm.bodyWeightKg) > 0 && (
              <div className="text-[10px] tracking-[0.2em] text-stone-600 mt-2" style={{ fontFamily: "ui-monospace, monospace" }}>
                → CALCULATED GOAL: {calculateWaterGoal(parseFloat(profileForm.bodyWeightKg))} ML
                ({Math.round(calculateWaterGoal(parseFloat(profileForm.bodyWeightKg)) / CUP_ML)} CUPS)
              </div>
            )}
          </FormField>
          <FormField label="Custom goal in ml (optional)">
            <input type="number" value={profileForm.waterGoalOverride}
              onChange={(e) => setProfileForm({ ...profileForm, waterGoalOverride: e.target.value })}
              placeholder="Leave blank to use calculated" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
            <div className="text-[10px] tracking-[0.15em] text-stone-500 mt-1 italic" style={{ fontFamily: "ui-monospace, monospace" }}>
              Overrides the calculated value if set
            </div>
          </FormField>
          <button onClick={saveProfile}
            className="w-full mt-4 bg-stone-900 text-stone-50 py-3 text-xs tracking-[0.3em] font-bold hover:bg-stone-700 transition-colors"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            SAVE GOAL
          </button>
        </Modal>
      )}

      {showWorkoutForm && (
        <Modal onClose={() => setShowWorkoutForm(false)} title="LOG TRAINING" num="I">
          <FormField label="Exercise" required>
            <input type="text" value={workoutForm.exercise} onChange={(e) => setWorkoutForm({ ...workoutForm, exercise: e.target.value })}
              placeholder="e.g. Morning run, Deadlifts" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration (min)">
              <input type="number" value={workoutForm.duration} onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
                placeholder="0" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
            </FormField>
            <FormField label="Calories burned">
              <input type="number" value={workoutForm.calories} onChange={(e) => setWorkoutForm({ ...workoutForm, calories: e.target.value })}
                placeholder="0" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
            </FormField>
          </div>
          <FormField label="Notes">
            <input type="text" value={workoutForm.notes} onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
              placeholder="Optional" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
          </FormField>
          <button onClick={addWorkout} disabled={!workoutForm.exercise.trim()}
            className="w-full mt-4 bg-stone-900 text-stone-50 py-3 text-xs tracking-[0.3em] font-bold hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            COMMIT TO RECORD
          </button>
        </Modal>
      )}

      {showMealForm && (
        <Modal onClose={() => setShowMealForm(false)} title={`LOG ${mealForm.type.toUpperCase()}`} num="II">
          <FormField label="Photo (optional)">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {mealForm.photo ? (
              <div className="relative inline-block">
                <img src={mealForm.photo} alt="Meal" className="w-32 h-32 object-cover border-2 border-stone-900" />
                <button onClick={() => setMealForm({ ...mealForm, photo: null })}
                  className="absolute -top-2 -right-2 bg-stone-900 text-stone-50 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-stone-400 flex flex-col items-center justify-center gap-2 text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors">
                <Camera size={24} />
                <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: "ui-monospace, monospace" }}>ADD PHOTO</span>
              </button>
            )}
          </FormField>

          <FormField label="Meal name" required>
            <input type="text" value={mealForm.name} onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
              placeholder="e.g. Oatmeal & berries" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" autoFocus />
          </FormField>
          <FormField label="Type">
            <div className="flex gap-1 border-2 border-stone-900 p-0.5">
              {MEAL_SLOTS.map((t) => (
                <button key={t} onClick={() => setMealForm({ ...mealForm, type: t })}
                  className={`flex-1 px-2 py-1.5 text-[10px] tracking-[0.2em] font-bold transition-colors ${
                    mealForm.type === t ? "bg-stone-900 text-stone-50" : "text-stone-900 hover:bg-stone-200"
                  }`}
                  style={{ fontFamily: "ui-monospace, monospace" }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Calories">
              <input type="number" value={mealForm.calories} onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                placeholder="0" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
            </FormField>
            <FormField label="Protein (g)">
              <input type="number" value={mealForm.protein} onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                placeholder="0" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
            </FormField>
          </div>
          <FormField label="Notes">
            <input type="text" value={mealForm.notes} onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
              placeholder="Optional" className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
          </FormField>
          <button onClick={addMeal} disabled={!mealForm.name.trim()}
            className="w-full mt-4 bg-stone-900 text-stone-50 py-3 text-xs tracking-[0.3em] font-bold hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            COMMIT TO RECORD
          </button>
        </Modal>
      )}

      {showWeightForm && (
        <Modal onClose={() => setShowWeightForm(false)} title="LOG WEIGHT" num="III">
          <FormField label="Weight" required>
            <div className="flex gap-2 items-end">
              <input type="number" step="0.1" value={weightForm.value} onChange={(e) => setWeightForm({ ...weightForm, value: e.target.value })}
                placeholder="0.0" className="flex-1 bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" autoFocus />
              <div className="flex gap-1 border-2 border-stone-900 p-0.5">
                {["kg", "lb"].map((u) => (
                  <button key={u} onClick={() => setWeightForm({ ...weightForm, unit: u })}
                    className={`px-3 py-1 text-[10px] tracking-[0.2em] font-bold transition-colors ${
                      weightForm.unit === u ? "bg-stone-900 text-stone-50" : "text-stone-900"
                    }`}
                    style={{ fontFamily: "ui-monospace, monospace" }}>
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </FormField>
          <FormField label="Notes">
            <input type="text" value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
              placeholder="Optional — morning, post-workout, etc." className="w-full bg-transparent border-b-2 border-stone-900 py-2 focus:outline-none text-base" />
          </FormField>
          <button onClick={addWeight} disabled={!weightForm.value}
            className="w-full mt-4 bg-stone-900 text-stone-50 py-3 text-xs tracking-[0.3em] font-bold hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            COMMIT TO RECORD
          </button>
        </Modal>
      )}
    </div>
  );
}

function StatBlock({ label, value, unit, icon, dark }) {
  return (
    <div className={`p-4 ${dark ? "bg-stone-900 text-stone-50" : "bg-stone-50"} border-stone-900 [&:not(:last-child)]:border-r-2`}>
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] opacity-70 mb-1" style={{ fontFamily: "ui-monospace, monospace" }}>
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-3xl font-black tracking-tight">{value}</div>
        <div className="text-xs opacity-60" style={{ fontFamily: "ui-monospace, monospace" }}>{unit}</div>
      </div>
    </div>
  );
}

function SectionHead({ num, title, icon, onAdd }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-stone-900 pb-2 mb-4">
      <div className="flex items-baseline gap-3">
        <span className="text-xs italic text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>§ {num}</span>
        <h2 className="text-2xl font-black italic flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      <button onClick={onAdd} className="bg-stone-900 text-stone-50 p-1.5 hover:bg-stone-700 transition-colors">
        <Plus size={16} />
      </button>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-sm italic text-stone-400 py-6 text-center">{text}</div>;
}

function Modal({ onClose, title, num, children }) {
  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-50 border-2 border-stone-900 w-full max-w-md p-6 relative my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-baseline border-b-2 border-stone-900 pb-3 mb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-xs italic text-stone-500" style={{ fontFamily: "ui-monospace, monospace" }}>§ {num}</span>
            <h2 className="text-xl font-black tracking-tight" style={{ fontFamily: "ui-monospace, monospace" }}>{title}</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900"><X size={18} /></button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] text-stone-600 block mb-1" style={{ fontFamily: "ui-monospace, monospace" }}>
        {label.toUpperCase()} {required && <span className="text-stone-900">*</span>}
      </label>
      {children}
    </div>
  );
}
