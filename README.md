# Ordination Announcement — Free Customizable Website

A free, personal announcement page for an ordination (or similar religious milestone) that you can set up in about 10 minutes — **no coding required**.

Your site will be hosted free on [GitHub Pages](https://pages.github.com). You can customize everything — names, dates, locations, colors, and more — directly from your live website using the built-in settings panel.

---

## What You'll Get

- A beautiful, mobile-friendly announcement page
- A live countdown timer to your ordination date
- Google Maps embeds for venue directions
- A contact form via Google Forms
- A livestream embed (or "Coming Soon" placeholder until you have a link)
- Four color themes to choose from (Burgundy, Navy, Forest Green, Slate)
- A settings panel to customize everything — no coding needed

---

## Step 1 — Create Your Own Copy

1. At the top of this page on GitHub, click the green **"Use this template"** button
2. Click **"Create a new repository"**
3. Give it a name — something like `my-ordination-site` works great
4. Make sure **"Public"** is selected (required for free GitHub Pages hosting)
5. Click **"Create repository"**

> **What just happened?** You now have your own private copy of this website that you fully control.

---

## Step 2 — Turn on Your Free Website

1. Inside your new repository, click the **"Settings"** tab (near the top, not the gear icon)
2. In the left sidebar, click **"Pages"**
3. Under **"Branch"**, change the dropdown from "None" to **"main"**
4. Leave the folder set to **"/ (root)"**
5. Click **"Save"**
6. Wait about 2 minutes
7. Refresh the page — a green banner will appear with your website address

Your site will be at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

> **Example:** If your GitHub username is `jdoe` and your repo is named `my-ordination-site`, your site will be at `https://jdoe.github.io/my-ordination-site/`

---

## Step 3 — Customize Your Site

1. Visit your live website (the address from Step 2)
2. Look for the **⚙ gear icon** in the bottom-right corner of the page — click it
3. The settings panel will slide open with several tabs:

| Tab | What you can change |
|-----|---------------------|
| **Identity** | Your name, page title, diocese, opening paragraph |
| **Events** | Dates, times, locations for both Masses; countdown target date |
| **Links** | Google Form URL, Livestream URL, Google Maps embed URLs |
| **Appearance** | Color theme (Burgundy, Navy, Forest, Slate) |
| **Sections** | Show or hide any part of the page |
| **Add Elements** | Add scripture quotes, custom text, video embeds, and more |

4. As you type or toggle settings, **the page updates live** so you can see exactly how it will look
5. When you're happy, click **"Save to GitHub"** (see Step 4)

---

## Step 4 — Save Your Changes

The first time you click "Save to GitHub," you'll need to connect the settings panel to your GitHub account. This is a one-time setup.

### 4a — Create a Personal Access Token

A Personal Access Token is like a special password that lets the settings panel save your changes directly to GitHub.

1. Click **"Save to GitHub"** in the settings panel
2. A setup window will appear — click the link that says **"github.com → Settings → Tokens → New token (classic)"**
3. It will open GitHub in a new tab
4. In the **"Note"** field, type: `Ordination Site`
5. Under **"Expiration"**, choose **90 days** (or longer)
6. Scroll down to **"Select scopes"** — check the box next to **"repo"**
7. Scroll all the way down and click **"Generate token"**
8. A green token will appear — it starts with `ghp_` — **copy it now** (you won't see it again)
9. Go back to your ordination site tab
10. Paste the token into the **"Personal Access Token"** field in the dialog
11. Check that your repository name is correct (e.g. `jdoe/my-ordination-site`)
12. Click **"Save & Continue"**

### 4b — Your changes are saved

After a few seconds, you'll see a "Saved!" message. Your site will automatically reload. It may take up to 60 seconds for GitHub to publish the update.

> **Future saves are easier:** After the first setup, clicking "Save to GitHub" will save immediately without the token setup.

---

## Frequently Asked Questions

### How do I change my Google Maps embed?

1. Go to [maps.google.com](https://maps.google.com) and search for your venue
2. Click **"Share"** → **"Embed a map"**
3. Copy the text that appears — it will look like: `<iframe src="https://www.google.com/maps/embed?pb=...">`
4. You only need the URL inside `src="..."` — copy just that part
5. Paste it into the settings panel under **Links → Google Maps Embed URL**

### How do I set up the RSVP form?

1. Create a form at [forms.google.com](https://forms.google.com)
2. Click **"Send"** → the **"< >"** embed tab
3. Copy the URL inside `src="..."` from the code shown
4. Paste it in the settings panel under **Links → Google Form Embed URL**

### What if my livestream link isn't ready yet?

Leave the livestream URL field empty in the settings panel. The page will show "Coming Soon" in its place. When you have a link (like a YouTube Live URL), paste it in and save.

### Can I change these settings later?

Yes, any time. Just visit your site, click the gear icon, make your changes, and save again.

### How do I add a scripture verse to the page?

1. Open the settings panel (gear icon)
2. Click the **"Add Elements"** tab
3. Click **"+ Scripture / Quote Block"**
4. A block is added to the bottom of the page with placeholder text
5. Click "Save to GitHub" — the block will now appear on your live site
6. To change the text: edit `config.js` directly in GitHub (see below)

### How do I edit config.js directly in GitHub?

1. Go to your repository on GitHub
2. Click on the file named **`config.js`**
3. Click the **pencil icon** (Edit this file) in the top-right
4. Change the text between the quotation marks
5. Click **"Commit changes"** at the bottom
6. Your site will update within about 60 seconds

### My token stopped working — what do I do?

Tokens expire. When it stops working, just click "Save to GitHub" again — it will ask you to enter a new token. Follow the same steps as before (Step 4a) to generate a new one.

### Is my Personal Access Token safe?

Yes. It is stored only in your browser (never sent to any server other than GitHub itself). It can only access the one repository you specify. You can delete it from GitHub at any time by going to GitHub → Settings → Developer Settings → Personal access tokens.

---

## Color Themes

| Theme | Primary Color | Best For |
|-------|--------------|----------|
| **Burgundy** | Deep red-purple | Traditional, liturgical |
| **Navy Blue** | Classic navy | Formal, classic |
| **Forest Green** | Deep forest | Natural, peaceful |
| **Slate** | Blue-grey | Modern, understated |

Switch themes instantly in the **Appearance** tab of the settings panel.

---

## Page Sections

All sections can be toggled on or off from the **Sections** tab in the settings panel.

| Section | Description |
|---------|-------------|
| Countdown Banner | Live countdown to the ordination date |
| Hero / Intro | Main title, diocese eyebrow, and opening paragraph |
| Event Details Card | Milestone date and brief description |
| Prayer Intentions | Bulleted list of prayer requests |
| Catechesis | Educational explanation of diaconate ordination |
| Livestream | Embedded video or "Coming Soon" placeholder |
| RSVP / Stay in Touch | Embedded Google Form |
| Mass of Ordination | Venue details with map |
| Mass of Thanksgiving | Second venue with map |

---

## Getting Help

If you run into trouble, please open an issue on this repository and describe what you're seeing. Include the URL of your site if possible.

---

*Made with care for those sharing this sacred milestone with family and friends.*
