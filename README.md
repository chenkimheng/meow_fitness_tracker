# The Training Ledger

A personal fitness and meal tracker. Built for you. Free to run.

---

## What you're about to do

Get this app live on the internet at a URL like `your-tracker.vercel.app`. You'll be able to open it on your phone, your laptop, anywhere — and bookmark it like any other website.

**Time needed:** ~10 minutes
**Cost:** Free, forever
**Coding required:** None

---

## Before you start — what you need

1. **GitHub account** — you said you have one ✓
2. **A computer** (any kind)
3. **A free Vercel account** — we'll create this together below

---

## STEP 1 — Get the code onto GitHub

You have two options. **Option A is easier.** Pick one.

### Option A: Upload through GitHub's website (no command line)

1. Go to **https://github.com/new**
2. Repository name: type `training-ledger` (or anything you like)
3. Set it to **Public** (Vercel's free tier needs public repos) or Private (works too)
4. Click **Create repository**
5. On the next page, click **"uploading an existing file"** (the blue link in the middle)
6. **Drag and drop ALL the files I gave you** into the upload area. Make sure you include the `src` folder too — drag the whole folder in.
7. Scroll down, click **Commit changes**

That's it for Step 1. Your code is now on GitHub.

### Option B: Use Git on the command line

If you know Git, you know what to do. Push the project folder to a new GitHub repo.

---

## STEP 2 — Deploy with Vercel

1. Go to **https://vercel.com/signup**
2. Click **"Continue with GitHub"** — sign in with your GitHub account
3. Approve the permissions Vercel asks for
4. Once you're in the Vercel dashboard, click **"Add New..."** → **"Project"**
5. You'll see a list of your GitHub repositories. Find **training-ledger** and click **Import**
6. On the next screen, **don't change anything**. Vercel auto-detects this is a Vite project.
7. Click the big **Deploy** button
8. Wait about 60 seconds. You'll see a celebration screen with your URL.

**That's it. Your app is live.**

---

## STEP 3 — Use it on your phone

1. Open Vercel's URL on your phone (e.g. `training-ledger-xyz.vercel.app`)
2. On iPhone: tap the Share button → **"Add to Home Screen"**
3. On Android (Chrome): tap the three-dot menu → **"Add to Home screen"** or **"Install app"**

Now you have an icon on your home screen that opens the tracker like a real app.

---

## A few things to know

- **Your data lives on your device, not the cloud.** Each device (phone vs laptop) keeps its own log. This is by design — it's private, fast, and free. The trade-off: clearing your browser data will erase your entries.
- **Photos take up space.** Your browser allows roughly 5–10 MB of storage. That's plenty for hundreds of meals at the compressed size we use. If you ever hit a limit, the app will tell you.
- **Want changes?** Edit the files on GitHub. Vercel will automatically rebuild and redeploy your app in about a minute. Magic.

---

## If something breaks

- **Vercel says "build failed"** — check that all files uploaded to GitHub. The `src` folder must be there with `App.jsx`, `main.jsx`, and `index.css` inside it.
- **App loads but looks broken** — open it in a different browser to confirm it's not a cache issue. Otherwise, come back and ask.
- **Anything else** — paste me the error message and I'll help.

Enjoy.
