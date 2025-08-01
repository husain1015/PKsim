# Deploy to shinyapps.io
# 
# Prerequisites:
# 1. Create a free account at https://www.shinyapps.io/
# 2. Install rsconnect: install.packages("rsconnect")
# 3. Get your account info from shinyapps.io dashboard

# Step 1: Configure your account (run this once)
# Uncomment and fill in your details:

# rsconnect::setAccountInfo(
#   name = 'YOUR_ACCOUNT_NAME',
#   token = 'YOUR_TOKEN',
#   secret = 'YOUR_SECRET'
# )

# Step 2: Deploy the app
# Make sure you're in the app directory
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# Deploy
rsconnect::deployApp(
  appDir = ".",
  appName = "PKsim",
  appTitle = "PK Model Simulator",
  appFiles = c("app.R", "R/", "install_packages.R"),
  forceUpdate = TRUE
)

# After successful deployment, update index.html with your app URL