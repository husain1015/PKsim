packages <- c("shiny", "mrgsolve", "ggplot2", "dplyr", "tidyr", "pracma", "stringr")

install_if_missing <- function(pkg) {
  if (!require(pkg, character.only = TRUE)) {
    install.packages(pkg, dependencies = TRUE)
  }
}

lapply(packages, install_if_missing)