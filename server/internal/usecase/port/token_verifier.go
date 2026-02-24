package port

type AccessClaims struct {
	UserID string
	Email  string
	Role   string
}

type TokenVerifier interface {
	VerifyAccess(token string) (*AccessClaims, error)
	VerifyRefresh(token string) (userID string, err error)
}
