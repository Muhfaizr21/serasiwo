package models

import "time"

type Item struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

var sampleItems = []Item{
	{
		ID:          1,
		Name:        "Paket Wedding Silver",
		Description: "Paket dekorasi dan dokumentasi pernikahan lengkap",
		CreatedAt:   time.Now(),
	},
	{
		ID:          2,
		Name:        "Paket Wedding Gold",
		Description: "Paket pernikahan eksklusif dengan full organizer & catering",
		CreatedAt:   time.Now(),
	},
}

func GetAllItems() []Item {
	return sampleItems
}

func CreateItem(name, description string) Item {
	newItem := Item{
		ID:          len(sampleItems) + 1,
		Name:        name,
		Description: description,
		CreatedAt:   time.Now(),
	}
	sampleItems = append(sampleItems, newItem)
	return newItem
}
