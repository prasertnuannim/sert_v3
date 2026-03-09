package handler

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	dbm "github.com/prasertnuannim/sert_v3/internal/adapter/persistence/gorm/model"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

type userResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

func toUserResponse(m dbm.User) userResponse {
	name := ""
	if m.Name != nil {
		name = *m.Name
	}

	email := ""
	if m.Email != nil {
		email = *m.Email
	}

	return userResponse{
		ID:        m.ID,
		Name:      name,
		Email:     email,
		Role:      m.Role,
		CreatedAt: m.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt: m.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func normalizeRole(role string) string {
	r := strings.ToLower(strings.TrimSpace(role))
	if r == "" {
		return "user"
	}
	return r
}

func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "unique constraint")
}

func (h *UserHandler) List(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	var total int64
	if err := h.db.WithContext(c.Context()).Model(&dbm.User{}).Count(&total).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to count users")
	}

	var users []dbm.User
	offset := (page - 1) * limit
	err := h.db.WithContext(c.Context()).
		Order("created_at desc").
		Offset(offset).
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch users")
	}

	out := make([]userResponse, 0, len(users))
	for _, user := range users {
		out = append(out, toUserResponse(user))
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"data":       out,
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": totalPages,
	})
}

func (h *UserHandler) GetByID(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	var user dbm.User
	err := h.db.WithContext(c.Context()).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch user")
	}

	return c.JSON(toUserResponse(user))
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(req.Email)
	role := normalizeRole(req.Role)

	if name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name is required")
	}
	if email == "" {
		return fiber.NewError(fiber.StatusBadRequest, "email is required")
	}

	user := dbm.User{
		ID:    uuid.NewString(),
		Name:  &name,
		Email: &email,
		Role:  role,
	}

	if err := h.db.WithContext(c.Context()).Create(&user).Error; err != nil {
		if isUniqueConstraintError(err) {
			return fiber.NewError(fiber.StatusConflict, "email already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create user")
	}

	return c.Status(fiber.StatusCreated).JSON(toUserResponse(user))
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	var req struct {
		Name  *string `json:"name"`
		Email *string `json:"email"`
		Role  *string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}

	updates := map[string]any{}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		updates["name"] = trimmed
	}
	if req.Email != nil {
		trimmed := strings.TrimSpace(*req.Email)
		if trimmed == "" {
			return fiber.NewError(fiber.StatusBadRequest, "email is required")
		}
		updates["email"] = trimmed
	}
	if req.Role != nil {
		trimmed := strings.TrimSpace(*req.Role)
		if trimmed == "" {
			return fiber.NewError(fiber.StatusBadRequest, "role is required")
		}
		updates["role"] = normalizeRole(trimmed)
	}
	if len(updates) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "at least one field is required")
	}

	res := h.db.WithContext(c.Context()).Model(&dbm.User{}).Where("id = ?", id).Updates(updates)
	if res.Error != nil {
		if isUniqueConstraintError(res.Error) {
			return fiber.NewError(fiber.StatusConflict, "email already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update user")
	}
	if res.RowsAffected == 0 {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	var user dbm.User
	err := h.db.WithContext(c.Context()).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch user")
	}

	return c.JSON(toUserResponse(user))
}

func (h *UserHandler) Delete(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	res := h.db.WithContext(c.Context()).Where("id = ?", id).Delete(&dbm.User{})
	if res.Error != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete user")
	}
	if res.RowsAffected == 0 {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	return c.SendStatus(fiber.StatusNoContent)
}
