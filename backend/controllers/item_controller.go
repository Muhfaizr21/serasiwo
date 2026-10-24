package controllers

import (
	"encoding/json"
	"net/http"
	"serasiwo-backend/models"
	"serasiwo-backend/views"
)

type CreateItemRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func GetItems(w http.ResponseWriter, r *http.Request) {
	items := models.GetAllItems()
	views.RenderJSON(w, http.StatusOK, true, "Berhasil mengambil daftar item", items)
}

func CreateItem(w http.ResponseWriter, r *http.Request) {
	var req CreateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		views.RenderJSON(w, http.StatusBadRequest, false, "Nama item wajib diisi", nil)
		return
	}

	item := models.CreateItem(req.Name, req.Description)
	views.RenderJSON(w, http.StatusCreated, true, "Item berhasil ditambahkan", item)
}
