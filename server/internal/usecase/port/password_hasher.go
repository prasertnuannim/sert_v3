package port

type PasswordHasher interface {
	Compare(hash, password string) bool
	Hash(password string) (string, error)
}