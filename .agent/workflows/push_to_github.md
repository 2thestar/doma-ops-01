---
description: How to push this project to a new GitHub repository
---

1.  **Create Repository on GitHub**:
    *   Go to [github.com/new](https://github.com/new).
    *   **Repository name**: `doma-housekeeping-os` (or similar).
    *   **Public/Private**: Private is recommended for internal tools.
    *   **Initialize**: Do **NOT** check "Add a README", "Add .gitignore", or "Choose a license". We already have these.
    *   Click **Create repository**.

2.  **Link Local Repository**:
    *   Copy the URL provided (e.g., `https://github.com/YOUR_USERNAME/doma-housekeeping-os.git`).
    *   Run the following commands in your terminal:

```bash
# Link the remote
git remote add origin <PASTE_YOUR_URL_HERE>

# Rename branch to main (standard practice)
git branch -M main

# Push your code
git push -u origin main
```

3.  **Future Pushes**:
    *   After making changes:
    
```bash
git add .
git commit -m "Description of change"
git push
```
