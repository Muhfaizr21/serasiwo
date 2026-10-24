package routes

import (
	"net/http"
	"serasiwo-backend/controllers"
	"serasiwo-backend/middlewares"
)

func SetupRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", controllers.HealthCheck)
	mux.HandleFunc("GET /api/items", controllers.GetItems)
	mux.HandleFunc("POST /api/items", controllers.CreateItem)

	return middlewares.CORSMiddleware(mux)
}
