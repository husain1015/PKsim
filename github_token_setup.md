# GitHub Personal Access Token Setup

## Step 1: Create Token on GitHub

1. Open your browser and go to: https://github.com/settings/tokens
   (Or navigate: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic))

2. Click **"Generate new token (classic)"**

3. Fill in the details:
   - **Note**: `PKsim-deployment` (or any descriptive name)
   - **Expiration**: Choose 30 days, 60 days, 90 days, or "No expiration"
   - **Select scopes**: Check the following:
     - ✅ **repo** (Full control of private repositories)
     - That's all you need!

4. Click **"Generate token"** at the bottom

5. **IMPORTANT**: Copy the token immediately! It looks like: `ghp_xxxxxxxxxxxxxxxxxxxx`
   (You won't be able to see it again)

## Step 2: Use Token to Push

Once you have your token, come back here and run:

```bash
# Replace YOUR_TOKEN_HERE with your actual token
git remote set-url origin https://husain1015:YOUR_TOKEN_HERE@github.com/husain1015/PKsim.git

# Example (DO NOT use this exact token - use your own!):
# git remote set-url origin https://husain1015:ghp_1234567890abcdef@github.com/husain1015/PKsim.git

# Then push
git push -u origin main
```

## Step 3: Verify Success

If successful, you'll see output like:
```
Enumerating objects: 13, done.
Counting objects: 100% (13/13), done.
...
To https://github.com/husain1015/PKsim.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## Security Notes

- Keep your token secret - don't share it
- The token will be stored in your git config
- To remove the token later: `git remote set-url origin https://github.com/husain1015/PKsim.git`

## Alternative: Store Token Securely

For better security, you can use git credential manager:
```bash
# Store credentials
git config --global credential.helper store

# Then push (it will ask for username and password)
git push -u origin main
# Username: husain1015
# Password: [paste your token here]
```

---

Ready? Go create your token at: https://github.com/settings/tokens