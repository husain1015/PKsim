# PK Model Simulator

An interactive R Shiny application for simulating pharmacokinetic (PK) profiles using mrgsolve.

## Features

- **Multiple PK Models**: Support for 1, 2, and 3 compartment models
- **Flexible Dosing**: Single or multiple dose regimens
- **Interactive Parameters**: Real-time adjustment of PK parameters
- **Visualization**: Log-scale concentration-time profiles
- **Exposure Metrics**: Automatic calculation of Cmax, Tmax, AUC, and steady-state parameters

## Online Access

The app can be accessed at: [GitHub Pages](https://husain1015.github.io/PKsim/)

The live Shiny app is hosted at: [shinyapps.io](https://husain1015.shinyapps.io/PKsim/)

## Local Installation

1. Clone this repository:
```bash
git clone https://github.com/husain1015/PKsim.git
cd PKsim
```

2. Install required packages:
```R
source("install_packages.R")
```

3. Run the app:
```R
shiny::runApp("app.R")
```

## Deployment Options

### Option 1: Deploy to shinyapps.io (Recommended)

1. Create a free account at [shinyapps.io](https://www.shinyapps.io/)

2. Install rsconnect package:
```R
install.packages("rsconnect")
```

3. Configure your account:
```R
rsconnect::setAccountInfo(name='YOUR_ACCOUNT_NAME',
                         token='YOUR_TOKEN',
                         secret='YOUR_SECRET')
```

4. Deploy the app:
```R
source("deploy.R")
```

### Option 2: GitHub Pages + shinyapps.io

1. Deploy to shinyapps.io (follow Option 1)
2. Update the app URL in `index.html`
3. Push to GitHub with GitHub Pages enabled on the main branch

## PK Models

### One Compartment Model
- Parameters: CL (Clearance), V (Volume)
- Suitable for drugs with rapid distribution

### Two Compartment Model
- Parameters: CL, V1 (Central Volume), V2 (Peripheral Volume), Q (Inter-compartmental Clearance)
- For drugs with initial distribution phase

### Three Compartment Model
- Parameters: CL, V1, V2, V3, Q2, Q3
- For drugs with complex distribution kinetics

## Usage

1. Select a PK model type
2. Choose single or multiple dosing
3. Enter dose amount and schedule
4. Adjust PK parameters
5. Click "Simulate" to generate profiles
6. View results in the plots and summary tables

## Dependencies

- R (>= 4.0.0)
- shiny (>= 1.7.0)
- mrgsolve (>= 1.0.0)
- ggplot2
- dplyr
- tidyr
- pracma

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first.