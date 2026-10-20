# BACKTRACKING LAB

Explore. Visualize. Understand. An interactive, browser-only learning tool for five Design and Analysis of Algorithms backtracking topics. There is no backend, account, API key, or algorithm service.

## Included algorithms

- General Backtracking Strategy — deterministic state-space tree traversal with a goal and meaningful pruning.
- N-Queens — row-by-row placement, one solution or all solutions.
- Hamiltonian Circuit — fixed-start undirected graph cycle search.
- Subset Sum — include/exclude search over positive integer positions.
- Graph Coloring — vertex-by-vertex assignment using at most M colors.

Each simulator includes working controls, immutable step history, event log, pseudocode, problem explanation, constraints, current state, complexity and CAT exam notes. Graph inputs are editable by toggling edges; subset values and targets are editable; examples can be restored.

## Technology

React, Vite, JavaScript, CSS and Lucide React. The algorithms run locally in the browser. The Vite asset base is relative (`./`) for project repository paths on GitHub Pages.

## Local setup

Install Node.js 20 or newer, then from the project directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Create an optimized production build with `npm run build`; preview it with `npm run preview`.

## Upload to GitHub

Create an empty GitHub repository, then run these commands in this folder (replace the remote URL):

```sh
git init
git add .
git commit -m "Build Backtracking Lab"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If this folder is already a Git repository, keep its existing history and add/commit/push the project files instead of running `git init`.

## GitHub Pages deployment

In the repository, open **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source. Push to `main` or manually run **Deploy to GitHub Pages** in the Actions tab. The workflow installs dependencies, builds `dist`, uploads it as a Pages artifact and deploys it. GitHub displays the actual published URL under Settings → Pages after a successful deployment; no deployment is claimed by this source project.

## Input limits and notes

N-Queens supports N=4–10 (larger boards are not offered to keep the interactive history responsive). The strategy tree uses branching 2–4 and depth 2–5. Graph examples contain 5–6 vertices; custom graph editing is supported. Subset Sum accepts 1–12 positive integer values (duplicates are distinct positions), each at most 999, and a positive target. These bounds keep full visual histories practical; enumerating all results can still create a long history for some inputs.

The graph vertex arrangement is fixed for clarity and is not draggable. Browser history is held in memory and is cleared by reset or page reload. Complexity statements describe worst-case algorithm behavior and exclude rendered visualization and stored history unless explicitly stated.
