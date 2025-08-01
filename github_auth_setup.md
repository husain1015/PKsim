# GitHub Authentication Setup

Choose one of these methods:

## Option 1: Personal Access Token (Recommended)

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "PKsim-deployment"
4. Select scopes: `repo` (full control of private repositories)
5. Generate token and copy it

Then use it to push:
```bash
# Update remote URL with token
git remote set-url origin https://husain1015:YOUR_PERSONAL_ACCESS_TOKEN@github.com/husain1015/PKsim.git

# Push
git push -u origin main
```

## Option 2: GitHub CLI (Easiest)

Install GitHub CLI and authenticate:
```bash
# Install GitHub CLI (if not already installed)
brew install gh  # on macOS

# Login to GitHub
gh auth login

# Follow prompts to authenticate via browser

# Then push normally
git push -u origin main
```

## Option 3: SSH Keys

1. Generate SSH key:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

2. Add to ssh-agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

3. Copy public key:
```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

4. Add to GitHub: Settings → SSH and GPG keys → New SSH key

5. Update remote:
```bash
git remote set-url origin git@github.com:husain1015/PKsim.git
git push -u origin main
```

## Quick Test

After setting up authentication, test with:
```bash
git push -u origin main
```