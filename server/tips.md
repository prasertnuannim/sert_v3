go run ./cmd/api






server/                                  # โฟลเดอร์โปรเจคหลัก (server)
├─ cmd/                                        # entrypoints (จุดเริ่มรันแอป) แยกตาม executable
│  └─ api/                                     # ตัวรัน API server
│     └─ main.go                               # main(): โหลด config, ต่อ DB, wire app, listen
├─ internal/                                   # โค้ดภายใน (ไม่ export ใช้นอกโมดูล)
│  ├─ domain/                                  # ชั้น Domain: กฎธุรกิจแท้ ๆ ไม่พึ่ง framework
│  │  ├─ entity/                               # โครงสร้างข้อมูลเชิงธุรกิจ (Pure structs)
│  │  │  ├─ user.go                            # User entity (ไม่ใช่ DB model)
│  │  │  └─ refresh_token.go                   # RefreshToken entity (expires/revoked ฯลฯ)
│  │  └─ errorx/                               # error กลางของโดเมน (ใช้ errors.Is ได้)
│  │     └─ errors.go                          # ErrInvalidCredentials, ErrTokenExpired ฯลฯ
│  ├─ usecase/                                 # ชั้น Usecase: กฎการทำงานของระบบ (application rules)
│  │  ├─ auth/                                 # ยูสเคสด้าน auth
│  │  │  └─ service.go                         # Login/Refresh/Me (คุม flow + business rules)
│  │  ├─ dto/                                  # DTO ที่ยูสเคสใช้รับ/ส่ง (ไม่ผูก HTTP)
│  │  │  └─ auth_dto.go                        # LoginInput/LoginOutput/RefreshOutput ฯลฯ
│  │  └─ port/                                 # Interfaces (ข้อตกลง) ที่ยูสเคสต้องการ
│  │     ├─ clock.go                           # Clock: Now() เพื่อเทสเวลาได้
│  │     ├─ password_hasher.go                 # PasswordHasher: Hash/Compare (bcrypt อยู่ infra)
│  │     ├─ token_repository.go                # TokenRepository: insert/get/revoke refresh token
│  │     ├─ token_signer.go                    # TokenSigner: ออก access/refresh token
│  │     ├─ token_verifier.go                  # TokenVerifier: ตรวจ token + ดึง claims
│  │     └─ user_repository.go                 # UserRepository: get user (email/id) + seed user
│  ├─ adapter/                                 # ชั้น Adapter: แปลงโลกภายนอกให้เข้ากับ usecase
│  │  ├─ http/                                 # HTTP adapter (Fiber)
│  │  │  ├─ handler/                           # handler รับ/ตอบ HTTP
│  │  │  │  └─ auth_handler.go                 # parse JSON, call usecase, map error → status
│  │  │  ├─ middleware/                        # middleware ก่อนถึง handler
│  │  │  │  ├─ auth.go                         # RequireAuth: ตรวจ Authorization Bearer token
│  │  │  │  ├─ logger.go                       # Logger: log method/path/status/latency
│  │  │  │  └─ request_id.go                   # RequestID: ใส่/ส่งต่อ X-Request-Id
│  │  │  └─ router.go                          # ผูก route + middleware (เช่น /auth/login, /me)
│  │  └─ persistence/                          # adapter ฝั่ง persistence (ฐานข้อมูล)
│  │     └─ gorm/                              # ใช้ GORM เป็น driver
│  │        ├─ model/                          # DB models (ตารางจริง) แยกจาก domain entity
│  │        │  ├─ user_model.go                # ตาราง users + gorm tags/index/unique
│  │        │  └─ refresh_token_model.go       # ตาราง refresh_tokens + index/unique
│  │        ├─ token_repo.go                   # implement TokenRepository ด้วย GORM
│  │        └─ user_repo.go                    # implement UserRepository ด้วย GORM
│  ├─ infra/                                   # ชั้น Infra: รายละเอียดที่เปลี่ยนบ่อย (drivers/tools)
│  │  ├─ config/                               # โหลด env/config
│  │  │  └─ config.go                          # Config struct + Load() จาก .env / env vars
│  │  ├─ db/                                   # การเชื่อมต่อฐานข้อมูล
│  │  │  └─ postgres.go                        # Connect() Postgres DSN + logger
│  │  ├─ jwt/                                  # JWT implementation
│  │  │  └─ signer_verifier.go                 # implement TokenSigner/TokenVerifier ด้วย jwt lib
│  │  ├─ security/                             # security utilities
│  │  │  └─ bcrypt_hasher.go                   # implement PasswordHasher ด้วย bcrypt
│  │  └─ time/                                 # เวลา (ทำให้เทสได้)
│  │     └─ clock.go                           # RealClock: Now() คืน time.Now()
│  └─ app/                                     # ชั้นประกอบแอป (composition root)
│     └─ wire/                                 # wiring / dependency injection (manual DI)
│        └─ wire.go                            # BuildApp(): สร้าง repo/infra/usecase/http แล้วคืน fiber.App
├─ .env.example                                # ตัวอย่าง env ที่ต้องใช้ (ไม่ใส่ secrets จริง)
├─ docker-compose.yml                          # สปิน DB (Postgres/MySQL) สำหรับ dev
└─ go.mod                                      # module path + dependencies