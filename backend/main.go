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
	sb := config.InitSupabase(cfg)
	if sb.IsConfigured() {
		log.Printf("Supabase dikonfigurasi: %s\n", sb.BaseURL)
	} else {
		log.Println("Peringatan: Variabel environment Supabase belum lengkap di .env")
	}

	router := routes.SetupRouter(sb)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server berjalan di http://localhost%s (env: %s)\n", addr, cfg.Env)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
