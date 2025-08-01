library(mrgsolve)

create_one_comp_model <- function() {
  code <- '
  $PARAM CL = 5, V = 50
  
  $CMT CENT
  
  $ODE
  dxdt_CENT = -CL/V * CENT;
  
  $TABLE
  double CP = CENT/V;
  
  $CAPTURE CP
  '
  
  mcode("one_comp", code)
}

create_two_comp_model <- function() {
  code <- '
  $PARAM CL = 5, V1 = 50, V2 = 100, Q = 10
  
  $CMT CENT PERIPH
  
  $ODE
  dxdt_CENT = -CL/V1 * CENT - Q/V1 * CENT + Q/V2 * PERIPH;
  dxdt_PERIPH = Q/V1 * CENT - Q/V2 * PERIPH;
  
  $TABLE
  double CP = CENT/V1;
  
  $CAPTURE CP
  '
  
  mcode("two_comp", code)
}

create_three_comp_model <- function() {
  code <- '
  $PARAM CL = 5, V1 = 50, V2 = 100, V3 = 200, Q2 = 10, Q3 = 5
  
  $CMT CENT PERIPH1 PERIPH2
  
  $ODE
  dxdt_CENT = -CL/V1 * CENT - Q2/V1 * CENT + Q2/V2 * PERIPH1 - Q3/V1 * CENT + Q3/V3 * PERIPH2;
  dxdt_PERIPH1 = Q2/V1 * CENT - Q2/V2 * PERIPH1;
  dxdt_PERIPH2 = Q3/V1 * CENT - Q3/V3 * PERIPH2;
  
  $TABLE
  double CP = CENT/V1;
  
  $CAPTURE CP
  '
  
  mcode("three_comp", code)
}

get_pk_model <- function(model_type) {
  switch(model_type,
         "one_comp" = create_one_comp_model(),
         "two_comp" = create_two_comp_model(),
         "three_comp" = create_three_comp_model()
  )
}