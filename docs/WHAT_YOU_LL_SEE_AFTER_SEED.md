# What You'll See After Loading Seed Data (New Montgomery County Account)

After you run the seed script and create a **new account** with a **Montgomery County address** (e.g. Rockville, Bethesda, Gaithersburg), here's what to expect.

---

## 1. Onboarding

- Sign up → Oath → **Address entry**
- Enter a Montgomery County address (e.g. "Rockville, MD" or a real address in Districts 14–20)
- The app will geocode it and set your profile: `county = 'Montgomery'`, `legislative_district = '14'`–`'20'` (depending on address), `congressional_district = '6'`

---

## 2. Command Feed (Main Tab)

On the **Command Feed** tab you should see **4 tactical missions** (directives):

1. **Relational Raid: Recruit Your Squad** – Target 1,000, no GPS
2. **Digital Ballot: Lock in Your Votes** – Target 5,000, no GPS
3. **Early Raid: Vote Early, Secure Victory** – Target 2,500, GPS required
4. **Election Day Siege: THE FINAL PUSH** – Target 10,000, GPS required

Each card shows title, body text, and target goal. Tapping a card shows the full mission brief (rewards, deadlines, etc. if the app displays those fields).

---

## 3. Ballot Tab

- **There is no Ballot tab yet.** Task 28 (Digital Ballot UI) will add it.
- Once Task 28 is built, the Ballot tab will show your district's races and candidates, with endorsed ones highlighted (e.g. neon green).

---

## 4. Other Tabs

- **Invite** – Invite flow (Task 27 will expand this)
- **Profile (two)** – Your profile, notifications, sign out. No ballot-specific data until Task 28.

---

## Quick Summary

| Where | What you'll see |
|-------|-----------------|
| **Command Feed** | 4 new tactical missions |
| **Ballot tab** | Not built yet (Task 28) – no ballot view |
| **Profile** | Normal profile; district set from Montgomery address |
| **Supabase** | Ballot data exists for your district for when we build Ballot UI |

**Bottom line:** Load the data in Supabase, create a new account with a Montgomery County address, and you should see the **4 missions on the Command Feed**. The ballot data is in the DB and will appear in the app once we add the Ballot tab in Task 28.
