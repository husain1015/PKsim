simulate_pk <- function(model_type, dose, dose_type, n_doses, tau, params, sim_time) {
  
  model <- get_pk_model(model_type)
  
  model <- param(model, .list = params)
  
  if (dose_type == "single") {
    events <- ev(amt = dose, cmt = 1, time = 0)
  } else {
    dose_times <- seq(0, by = tau, length.out = n_doses)
    events <- ev(amt = dose, cmt = 1, time = dose_times)
  }
  
  out <- model %>%
    ev(events) %>%
    mrgsim(end = sim_time, delta = 0.1) %>%
    as_tibble()
  
  param_summary <- create_param_summary(model_type, params)
  exposure_metrics <- calculate_exposure_metrics(out, dose, dose_type, n_doses, tau)
  
  list(
    data = out,
    param_summary = param_summary,
    exposure_metrics = exposure_metrics
  )
}

create_param_summary <- function(model_type, params) {
  if (model_type == "one_comp") {
    data.frame(
      Parameter = c("Clearance (CL)", "Volume (V)", "Half-life (t1/2)"),
      Value = c(
        paste0(params$CL, " L/h"),
        paste0(params$V, " L"),
        paste0(round(0.693 * params$V / params$CL, 2), " h")
      ),
      stringsAsFactors = FALSE
    )
  } else if (model_type == "two_comp") {
    alpha <- 0.5 * ((params$CL/params$V1 + params$Q/params$V1 + params$Q/params$V2) + 
                    sqrt((params$CL/params$V1 + params$Q/params$V1 + params$Q/params$V2)^2 - 
                         4 * params$CL/params$V1 * params$Q/params$V2))
    beta <- 0.5 * ((params$CL/params$V1 + params$Q/params$V1 + params$Q/params$V2) - 
                   sqrt((params$CL/params$V1 + params$Q/params$V1 + params$Q/params$V2)^2 - 
                        4 * params$CL/params$V1 * params$Q/params$V2))
    
    data.frame(
      Parameter = c("Clearance (CL)", "Central Volume (V1)", "Peripheral Volume (V2)", 
                   "Inter-compartmental Clearance (Q)", "Alpha Half-life", "Beta Half-life"),
      Value = c(
        paste0(params$CL, " L/h"),
        paste0(params$V1, " L"),
        paste0(params$V2, " L"),
        paste0(params$Q, " L/h"),
        paste0(round(0.693/alpha, 2), " h"),
        paste0(round(0.693/beta, 2), " h")
      ),
      stringsAsFactors = FALSE
    )
  } else {
    data.frame(
      Parameter = c("Clearance (CL)", "Central Volume (V1)", "Peripheral Volume 1 (V2)", 
                   "Peripheral Volume 2 (V3)", "Inter-compartmental Clearance 1 (Q2)",
                   "Inter-compartmental Clearance 2 (Q3)"),
      Value = c(
        paste0(params$CL, " L/h"),
        paste0(params$V1, " L"),
        paste0(params$V2, " L"),
        paste0(params$V3, " L"),
        paste0(params$Q2, " L/h"),
        paste0(params$Q3, " L/h")
      ),
      stringsAsFactors = FALSE
    )
  }
}

calculate_exposure_metrics <- function(data, dose, dose_type, n_doses, tau) {
  if (dose_type == "single") {
    cmax <- max(data$CP)
    tmax <- data$time[which.max(data$CP)]
    auc <- pracma::trapz(data$time, data$CP)
    
    data.frame(
      Metric = c("Cmax", "Tmax", "AUC(0-inf)"),
      Value = c(
        paste0(round(cmax, 2), " mg/L"),
        paste0(round(tmax, 2), " h"),
        paste0(round(auc, 2), " mg*h/L")
      ),
      stringsAsFactors = FALSE
    )
  } else {
    last_dose_time <- (n_doses - 1) * tau
    ss_data <- data %>% filter(time >= last_dose_time & time < last_dose_time + tau)
    
    cmax_ss <- max(ss_data$CP)
    cmin_ss <- min(ss_data$CP)
    tmax_ss <- ss_data$time[which.max(ss_data$CP)] - last_dose_time
    auc_ss <- pracma::trapz(ss_data$time - last_dose_time, ss_data$CP)
    
    data.frame(
      Metric = c("Cmax,ss", "Cmin,ss", "Tmax,ss", "AUCtau,ss", "Accumulation Ratio"),
      Value = c(
        paste0(round(cmax_ss, 2), " mg/L"),
        paste0(round(cmin_ss, 2), " mg/L"),
        paste0(round(tmax_ss, 2), " h"),
        paste0(round(auc_ss, 2), " mg*h/L"),
        paste0(round(cmax_ss / max(data$CP[data$time <= tau]), 2))
      ),
      stringsAsFactors = FALSE
    )
  }
}