# Deployment Instructions for PK Model Simulator

## Step 1: Push to GitHub

Since there's a permission issue with the automated push, please follow these manual steps:

1. Make sure you're logged into GitHub with the correct account (husain1015)
2. Open terminal in the `pk-shiny-app` directory
3. Run these commands:

```bash
# Check your git remote
git remote -v

# If needed, update the remote URL to use your personal access token
git remote set-url origin https://husain1015@github.com/husain1015/PKsim.git

# Or use SSH if you have SSH keys set up
git remote set-url origin git@github.com:husain1015/PKsim.git

# Push the code
git push -u origin main
```

## Step 2: Enable GitHub Pages

1. Go to https://github.com/husain1015/PKsim
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"
7. Your site will be available at https://husain1015.github.io/PKsim/

## Step 3: Deploy to shinyapps.io

1. Create an account at https://www.shinyapps.io/ if you haven't already
2. Install rsconnect in R:
```R
install.packages("rsconnect")
```

3. Get your account tokens from shinyapps.io dashboard
4. Configure your account in R:
```R
rsconnect::setAccountInfo(
  name = 'husain1015',  # or your shinyapps.io username
  token = 'YOUR_TOKEN',
  secret = 'YOUR_SECRET'
)
```

5. Deploy the app:
```R
# Navigate to the app directory first
setwd("/Users/husainattarwala/Downloads/Shiny/pk-shiny-app")

# Deploy
rsconnect::deployApp(
  appDir = ".",
  appName = "PKsim",
  appTitle = "PK Model Simulator",
  forceUpdate = TRUE
)
```

## Alternative: Manual File Upload to GitHub

If git push doesn't work, you can:

1. Go to https://github.com/husain1015/PKsim
2. Click "Add file" → "Upload files"
3. Drag and drop all files from the pk-shiny-app folder
4. Commit the changes

## Testing Locally

Before deployment, test the app locally:

```R
# Install packages
source("install_packages.R")

# Run the app
shiny::runApp("app.R")
```

## Troubleshooting

- **GitHub Push Issues**: Use a personal access token or SSH keys
- **Shiny Deployment Issues**: Make sure all required packages are listed in the app
- **mrgsolve Issues**: May need to install Rtools on Windows or Xcode on macOS

## Files Structure

```
PKsim/
├── app.R                    # Main Shiny application
├── R/
│   ├── pk_models.R         # mrgsolve model definitions
│   ├── server_functions.R  # Server logic functions
│   └── ui_components.R     # UI components (placeholder)
├── index.html              # GitHub Pages landing page
├── README.md               # Project documentation
├── deploy.R                # Deployment script
├── install_packages.R      # Package installation script
├── renv.lock              # Package versions
├── .gitignore             # Git ignore file
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions workflow
```