library(shiny)
library(mrgsolve)
library(ggplot2)
library(dplyr)
library(tidyr)

source("R/pk_models.R")
source("R/ui_components.R")
source("R/server_functions.R")

ui <- fluidPage(
  titlePanel("PK Model Simulator"),
  
  sidebarLayout(
    sidebarPanel(
      width = 4,
      
      h4("Model Selection"),
      selectInput("model_type", "PK Model Type:",
                  choices = c("One Compartment" = "one_comp",
                              "Two Compartment" = "two_comp",
                              "Three Compartment" = "three_comp")),
      
      h4("Dosing Regimen"),
      radioButtons("dose_type", "Dose Type:",
                   choices = c("Single Dose" = "single",
                               "Multiple Doses" = "multiple")),
      
      numericInput("dose", "Dose (mg):", value = 100, min = 0),
      
      conditionalPanel(
        condition = "input.dose_type == 'multiple'",
        numericInput("n_doses", "Number of Doses:", value = 5, min = 1),
        numericInput("tau", "Dosing Interval (hours):", value = 24, min = 0.1)
      ),
      
      h4("PK Parameters"),
      conditionalPanel(
        condition = "input.model_type == 'one_comp'",
        numericInput("CL", "Clearance (L/h):", value = 5, min = 0.01),
        numericInput("V", "Volume (L):", value = 50, min = 0.1)
      ),
      
      conditionalPanel(
        condition = "input.model_type == 'two_comp'",
        numericInput("CL", "Clearance (L/h):", value = 5, min = 0.01),
        numericInput("V1", "Central Volume (L):", value = 50, min = 0.1),
        numericInput("V2", "Peripheral Volume (L):", value = 100, min = 0.1),
        numericInput("Q", "Inter-compartmental Clearance (L/h):", value = 10, min = 0.01)
      ),
      
      conditionalPanel(
        condition = "input.model_type == 'three_comp'",
        numericInput("CL", "Clearance (L/h):", value = 5, min = 0.01),
        numericInput("V1", "Central Volume (L):", value = 50, min = 0.1),
        numericInput("V2", "Peripheral Volume 1 (L):", value = 100, min = 0.1),
        numericInput("V3", "Peripheral Volume 2 (L):", value = 200, min = 0.1),
        numericInput("Q2", "Inter-compartmental Clearance 1 (L/h):", value = 10, min = 0.01),
        numericInput("Q3", "Inter-compartmental Clearance 2 (L/h):", value = 5, min = 0.01)
      ),
      
      h4("Simulation Settings"),
      numericInput("sim_time", "Simulation Time (hours):", value = 120, min = 1),
      
      actionButton("simulate", "Simulate", class = "btn-primary", style = "width: 100%;")
    ),
    
    mainPanel(
      width = 8,
      tabsetPanel(
        tabPanel("Concentration-Time Profile",
                 plotOutput("pk_plot", height = "500px")),
        tabPanel("Summary",
                 h4("PK Parameters Summary"),
                 tableOutput("param_summary"),
                 h4("Exposure Metrics"),
                 tableOutput("exposure_summary"))
      )
    )
  )
)

server <- function(input, output, session) {
  
  simulation_results <- eventReactive(input$simulate, {
    req(input$model_type, input$dose)
    
    withProgress(message = 'Running simulation...', value = 0, {
      setProgress(0.3)
      
      if (input$model_type == "one_comp") {
        params <- list(CL = input$CL, V = input$V)
      } else if (input$model_type == "two_comp") {
        params <- list(CL = input$CL, V1 = input$V1, V2 = input$V2, Q = input$Q)
      } else {
        params <- list(CL = input$CL, V1 = input$V1, V2 = input$V2, 
                       V3 = input$V3, Q2 = input$Q2, Q3 = input$Q3)
      }
      
      setProgress(0.6)
      
      result <- simulate_pk(
        model_type = input$model_type,
        dose = input$dose,
        dose_type = input$dose_type,
        n_doses = ifelse(input$dose_type == "single", 1, input$n_doses),
        tau = ifelse(input$dose_type == "single", 0, input$tau),
        params = params,
        sim_time = input$sim_time
      )
      
      setProgress(1)
      return(result)
    })
  })
  
  output$pk_plot <- renderPlot({
    req(simulation_results())
    
    data <- simulation_results()$data
    
    ggplot(data, aes(x = time, y = CP)) +
      geom_line(size = 1.2, color = "#0066CC") +
      scale_x_continuous(breaks = seq(0, max(data$time), by = 
                                      ifelse(max(data$time) > 100, 24, 12))) +
      scale_y_continuous(trans = "log10") +
      labs(x = "Time (hours)", 
           y = "Concentration (mg/L)",
           title = paste("PK Profile -", 
                         gsub("_", " ", str_to_title(input$model_type)), 
                         "Model")) +
      theme_minimal() +
      theme(
        plot.title = element_text(size = 16, face = "bold"),
        axis.title = element_text(size = 14),
        axis.text = element_text(size = 12),
        panel.grid.minor = element_blank()
      )
  })
  
  output$param_summary <- renderTable({
    req(simulation_results())
    simulation_results()$param_summary
  })
  
  output$exposure_summary <- renderTable({
    req(simulation_results())
    simulation_results()$exposure_metrics
  })
}

shinyApp(ui = ui, server = server)