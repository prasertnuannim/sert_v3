package port

import "time"

type TokenSigner interface {
	SignAccess(userID string, email string, role string) (token string, exp time.Time, err error)
	SignRefresh(userID string) (token string, exp time.Time, err error)
}
