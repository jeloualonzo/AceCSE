# AceCSE

![License](https://img.shields.io/badge/license-MIT-blue)
![Built with React](https://img.shields.io/badge/built%20with-React%20%2B%20TypeScript-61dafb)
![Status](https://img.shields.io/badge/status-actively%20developed-brightgreen)

### Your free Civil Service Examination practice companion.

AceCSE is a free online **Civil Service Examination (CSE) simulator for the Philippines**, built to help examinees prepare through realistic simulations, focused practice, detailed explanations, and performance tracking.

Whether you're preparing for the **Professional** or **Subprofessional** level, AceCSE gives you a place to practice before exam day.

> **Practice. Understand. Improve. Be ready.**

**[Start Practicing with AceCSE →](https://acecse.pages.dev/)**

---

## What is AceCSE?

Preparing for the Civil Service Examination isn't just about answering as many questions as possible.

You need to know **where you're weak, understand your mistakes, and get comfortable answering questions under time pressure**.

AceCSE is designed around that idea.

It separates preparation into two experiences:

**Simulation** — test yourself under realistic exam conditions.

**Practice** — slow down, learn from mistakes, and strengthen specific subjects.

---

## 🎯 Take a Realistic Exam Simulation

When you want to know how prepared you really are, start a simulation.

AceCSE supports both CSE levels with their corresponding exam structure and time limits.

|                       |       Professional |    Subprofessional |
| --------------------- | -----------------: | -----------------: |
| **Questions**         |                170 |                165 |
| **Time Limit**        | 3 hours 10 minutes | 2 hours 40 minutes |
| **Passing Threshold** |                80% |                80% |

Available shorter simulations let you practice without committing to a full-length examination.

As the question bank grows, longer simulations become available while maintaining the appropriate subject distribution.

### Exam coverage

**Professional**

* Numerical Reasoning
* Analytical Reasoning
* Verbal Ability
* General Information

**Subprofessional**

* Numerical Reasoning
* Clerical Ability
* Verbal Ability
* General Information

---

## 📚 Practice by Subject

You don't always need to take a complete exam.

Practice the areas you want to improve and choose how many questions you want to answer.

Available practice sizes include:

**10 · 20 · 30 · 50 · 100 · All Available**

You can focus on the subjects that need the most work instead of repeatedly taking full examinations.

---

## 💡 Learn From Your Mistakes

Getting a question wrong shouldn't be the end of the learning process.

AceCSE provides explanations designed to help you understand the answer, not simply reveal it.

Depending on the question, explanations can include:

* Detailed answer explanations
* Step-by-step solutions
* Why incorrect choices are wrong
* Exam tips
* Common mistakes
* Mnemonics and memory aids
* Grammar rules
* Math shortcuts
* Legal or factual references

The goal is simple:

> **Don't just memorize the answer. Understand why it's the answer.**

---

## 📊 Know Where You Stand

After completing a simulation or practice session, AceCSE turns your answers into useful feedback.

You can see:

* Overall score
* Percentage
* Pass/fail result
* Correct and incorrect answers
* Performance by subject
* Question-level results
* Time spent
* Detailed explanations

Your completed attempts are also saved to your account so you can return to them later.

Instead of wondering *"Am I ready?"*, you can use your actual practice history to see how you're performing.

---

## ⏱️ Practice Under Time Pressure

The actual CSE is timed.

AceCSE's simulation mode is designed to make time management part of your preparation.

Active examinations use a deadline-based timer, and an in-progress session is preserved locally so a refresh or unexpected interruption doesn't simply erase your current exam.

For focused practice, you can also choose whether to practice with or without a timer.

---

## 🧠 Simulation vs. Practice

AceCSE intentionally keeps these experiences separate.

### Simulation

**Measure yourself.**

Use simulation when you want to:

* Experience exam pressure
* Practice time management
* Test your overall preparation
* Measure your current score
* Review your performance afterward

### Practice

**Improve yourself.**

Use practice when you want to:

* Focus on a particular subject
* Work through difficult topics
* Learn from explanations
* Identify recurring mistakes
* Build confidence before taking a simulation

You don't have to choose one.

A useful preparation cycle can be:

**Practice → Review → Practice → Simulate → Analyze → Repeat**

---

## 👤 Your Progress Stays With You

AceCSE supports accounts through:

* Google sign-in
* Email and password

Your completed attempts are associated with your account, allowing you to return to your history instead of starting from zero every time.

You can also connect an email/password login to an existing Google account without creating a separate account.

---

## 📖 A Growing Question Bank

AceCSE uses a structured question bank organized by:

* Exam level
* Subject
* Topic
* Subtopic
* Difficulty
* Tags

The question bank is continuously being expanded and validated so that examinees can get more variety when practicing repeatedly.

Questions are authored for AceCSE rather than simply reproducing existing commercial reviewer materials.

Fact-based questions can include references to relevant laws, constitutional provisions, or other sources where appropriate.

---

## 🇵🇭 Built for Filipino CSE Examinees

AceCSE is being built specifically around the needs of people preparing for the **Philippine Civil Service Examination**.

The goal is to make useful exam preparation accessible without requiring an expensive review subscription.

Whether you're taking the exam for your first time or preparing for another attempt, AceCSE is meant to be a practical place to study and measure your readiness.

---

## 🚀 Start Practicing

Ready to see where you stand?

**[Open AceCSE →](https://acecse.pages.dev/)**

Practice a subject.

Take a simulation.

Learn from your mistakes.

Come back and improve.

---

## 🛠️ About This Repository

This repository contains the source code used to build AceCSE.

The application itself is intended to be a **free study resource for CSE examinees**. The source code is publicly available for people who want to inspect the project, learn from it, fork it, or contribute.

If you're here because you want to **prepare for the Civil Service Examination**, you don't need to understand the codebase to use AceCSE.

Just open the application and start practicing.

### Technology

AceCSE is built with:

* React
* TypeScript
* Vite
* Tailwind CSS
* Firebase Authentication
* Cloud Firestore

---

## 🧑‍💻 Getting Started (Local Development)

Want to run AceCSE on your own machine? Here's how:

```bash
# 1. Clone the repository
git clone https://github.com/jeloualonzo/AceCSE.git
cd AceCSE

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# then fill in your Firebase config in .env

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

Other useful commands:

* `npm run build` — build for production
* `npm run typecheck` — check TypeScript types
* `npm run validate:questions` — validate the question bank JSON files

---

## 🤝 Contributions

The project is open to contributions, particularly improvements that make CSE preparation more useful, accurate, and accessible.

If contributing questions or educational content, accuracy and originality are important.

Please do not submit copyrighted reviewer material copied verbatim from commercial or protected sources.

---

## 📌 Project Status

AceCSE is actively being developed.

The question bank, learning features, analytics, and overall preparation experience will continue to evolve as the project grows.

The goal isn't to build another website full of random practice questions.

The goal is to build a **useful, honest, and accessible preparation tool for the Philippine Civil Service Examination.**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**AceCSE — Practice smarter. Prepare with purpose.**
