package main

import (
	"fmt"
	"log"
	"net/http"
	"serasiwo-backend/config"
	"serasiwo-backend/routes"
)

func main() {
	cfg := config.LoadConfig()
	router := routes.SetupRouter()

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server berjalan di http://localhost%s (env: %s)\n", addr, cfg.Env)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
