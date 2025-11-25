bind = "0.0.0.0:5001"
workers = 4
accesslog = "-"
errorlog = "-"
loglevel = "debug"
proc_name = "ecommerce_demo"
# Increase timeout to prevent premature closing
timeout = 120
# Ensure we don't buffer too aggressively
worker_class = "sync"
