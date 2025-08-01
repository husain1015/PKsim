library(rsconnect)

# Configure your shinyapps.io account
# rsconnect::setAccountInfo(name='YOUR_ACCOUNT_NAME',
#                          token='YOUR_TOKEN',
#                          secret='YOUR_SECRET')

# Deploy the application
rsconnect::deployApp(
  appDir = ".",
  appName = "PKsim",
  appTitle = "PK Model Simulator",
  forceUpdate = TRUE
)