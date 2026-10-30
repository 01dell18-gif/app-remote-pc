Product Requirements Document (PRD): Sistem Pengendali dan Pemantauan Jaringan Laboratorium Komputer Berbasis Web (App Remote)1. Landasan Arsitektur Rekayasa dan Topologi SistemPengelolaan laboratorium komputer institusional modern menghadapi tantangan operasional yang kompleks seiring meningkatnya densitas perangkat keras dan tuntutan efisiensi pengajaran. Pendekatan konvensional yang bergantung pada instalasi perangkat lunak biner mandiri (thick-client) di setiap terminal instruktur sering kali memunculkan friksi pemeliharaan, ketidakcocokan dependensi sistem operasi, dan kerentanan keamanan port jaringan terbuka. Sistem "App Remote" mentransisikan paradigma tersebut menuju arsitektur gerbang kendali jarak jauh berbasis web tanpa instalasi klien (clientless web-based remote gateway), memungkinkan seorang pengelola laboratorium atau pengajar melakukan orkestrasi daya, pemantauan visual terdistribusi, dan kendali jarak jauh penuh melalui peramban web modern tanpa memerlukan ekstensi atau plugin pihak ketiga.Arsitektur sistem dibangun di atas topologi tiga lapisan (three-tier topology) yang beroperasi di dalam batas segmen jaringan area lokal (Local Area Network / LAN) atau jaringan nirkabel (Wireless LAN / Wi-Fi) terpadu:Lapisan Presentasi (Presentation Tier): Beroperasi secara penuh di dalam peramban web standar memanfaatkan elemen HTML5 Canvas yang diakselerasi perangkat keras, berkomunikasi melalui protokol dua arah WebSockets untuk mentransmisikan framebuffer grafis dan menangkap event perangkat masukan secara low-latency.Lapisan Perantara (Application & Gateway Tier): Menjalankan server aplikasi backend Node.js yang bertindak sebagai orkestrator inventaris, pengelola sesi otentikasi JWT, penyedia REST API, serta jembatan protokol (protocol translation gateway) berbasis pustaka guacamole-lite yang terintegrasi langsung dengan daemon guacd (Apache Guacamole daemon) melalui soket TCP internal. Daemon ini menerjemahkan instruksi protokol grafis tingkat rendah dari mesin target menjadi instruksi grafis Guacamole yang kompatibel dengan WebSockets.Lapisan Titik Akhir (Endpoint Tier): Mencakup seluruh workstation laboratorium berbasis Microsoft Windows atau Linux yang dikendalikan melalui protokol bawaan seperti Remote Desktop Protocol (RDP), Virtual Network Computing (RFB/VNC), atau agen latar belakang berbobot ringan (lightweight resident agent).Alur interkoneksi komponen dalam jaringan lokal:Peramban web instruktur membentuk koneksi HTTPS (port 443) untuk mengambil antarmuka dasbor dan membuka saluran WebSocket Secure (WSS) menuju Server Aplikasi Backend.Server Aplikasi Backend menerbitkan token terenkripsi dan membuka koneksi IPC/TCP internal (port 4822) ke daemon penerjemah protokol guacd.Daemon guacd mengeksekusi koneksi RDP native (port 3389 / RPC dinamis) atau VNC (port 5900) ke masing-masing workstation target di laboratorium.Untuk manajemen daya, Server Aplikasi Backend mengirimkan paket UDP broadcast (port 7/9) langsung ke subnet laboratorium untuk mengaktifkan fitur Wake-on-LAN.Parameter ArsitekturalRDP Konsol Mandiri (Port 3389)RDP Shadowing (Console Session)Protokol RFB / VNC (Port 5900)Agen Kustom Berbasis LayananDukungan Sesi Fisik AktifSesi pengguna lokal otomatis terkunci (lock screen)Memantau layar fisik aktif tanpa memutus sesi siswaBerbagi layar fisik aktif secara transparanKendali penuh layar fisik dan injeksi masukanKebutuhan Agen TambahanTanpa instalasi agen (komponen bawaan Windows)Tanpa agen (konfigurasi GPO/Firewall Windows)Memerlukan instalasi VNC Server pada setiap hostMemerlukan instalasi service latar belakangBeban Lebar Pita per WorkstationSangat hemat (1.0 - 3.0 Mbps sesi interaktif)Sangat hemat (1.0 - 3.0 Mbps)Sedang hingga Tinggi (3.0 - 8.0 Mbps, JPEG)Tergantung kompresi (1.5 - 4.0 Mbps, VP8/H.264)Latensi Input Jaringan LokalSangat rendah (< 25 ms pada LAN Gigabit)Sangat rendah (< 30 ms pada LAN Gigabit)Rendah (30 - 60 ms pada LAN Gigabit)Sangat rendah (< 20 ms via WebSockets)Interoperabilitas Gerbang WebTerintegrasi penuh dengan daemon guacdMemerlukan penargetan Session ID via guacdKompatibel penuh dengan guacd dan noVNCMemerlukan soket WebSocket langsung ke gateway2. Tumpukan Teknologi Terdefinisi (Definitive Tech Stack)Untuk memastikan keandalan, skalabilitas, dan kemudahan eksekusi otomatis oleh coding agent, tumpukan teknologi ditetapkan secara pasti tanpa opsi ambigu:Lapisan Frontend:Framework: React 18 / Vite dengan TypeScript (Strict Mode).Styling & UI Components: Tailwind CSS dipadukan dengan Lucide React (ikon) dan Radix UI primitives.Protokol Render Remote: Pustaka resmi guacamole-common-js untuk abstraksi kanvas HTML5, manajemen buffer mouse/keyboard, dan pertukaran instruksi Guacamole.State Management: Zustand atau TanStack Query (React Query) untuk sinkronisasi state data perangkat dan penanganan polling status.Lapisan Backend:Runtime & Framework: Node.js (LTS v20+) menggunakan Fastify atau Express dengan TypeScript.Gerbang Remote Desktop: Pustaka guacamole-lite yang mengelola konversi WebSocket ke soket TCP daemon guacd.Kriptografi Token: Pustaka bawaan Node.js crypto untuk enkripsi token AES-256-CBC parameter koneksi gerbang.Orkestrasi Daya & Jaringan: Paket wake_on_lan (transmisi paket UDP magic), ping / soket raw TCP untuk verifikasi heartbeat, serta integrasi pustaka eksekusi remote shell (WinRM / SSH).Otentikasi: JWT (jsonwebtoken) dan hashing kata sandi bcrypt.Lapisan Basis Data:Database Engine: PostgreSQL 15+ (atau SQLite 3 untuk pengujian mandiri cepat).Object-Relational Mapping (ORM): Prisma ORM untuk deklarasi skema tipe statis, migrasi otomatis, dan seed data awal.Infrastruktur Gateway Titik Akhir:Daemon Protokol: Citra resmi Docker guacamole/guacd:latest yang mendengarkan pada port TCP 4822.Container Orchestration: Docker Compose untuk mengemas layanan guacd, backend, database, dan mock workstation ke dalam satu perintah eksekusi.3. Analisis Kebutuhan Fungsional Sistem3.1. Inventarisasi dan Pemetaan Workstation LaboratoriumSistem menyediakan modul pendaftaran perangkat berbasis metadata teknis: Nama PC / Hostname, Alamat IPv4 (statis/DHCP reservasi), Alamat MAC (format XX:XX:XX:XX:XX:XX), Ruang Lab, serta penetapan koordinat fisik meja (Baris dan Kolom).Validasi ketat diterapkan saat input untuk mencegah duplikasi alamat IP dan MAC address di dalam database.Terdapat mesin heartbeat checker otomatis yang berjalan di latar belakang server, melakukan pengecekan ketersediaan host melalui ICMP ping atau TCP SYN probe setiap 5–10 detik, memutakhirkan status workstation menjadi ONLINE, OFFLINE, atau IN_SESSION.3.2. Manajemen Daya Jaringan (Power Orchestration)Wake-on-LAN (WoL): Pengiriman sinyal bangun daya ke antarmuka jaringan target melalui Magic Packet UDP terarah (directed subnet broadcast) untuk membangunkan komputer dari status daya ACPI S5 (Soft Off) atau S3/S4 (Sleep/Hibernate). Fitur ini mendukung penyalaan individual maupun massal per ruangan lab.Remote Shutdown & Reboot: Pengiriman instruksi pematian atau mulai ulang sistem operasi secara terpusat dan tertib (graceful) menggunakan antarmuka administratif Windows (WinRM / WMI RPC) atau Linux SSH, dilengkapi parameter jeda waktu (grace period).3.3. Transmisi Remote Desktop dan Interaktivitas GrafisPenyajian desktop interaktif berlatensi rendah secara langsung di dalam peramban web memanfaatkan elemen HTML5 Canvas yang dialirkan melalui WebSockets terenkripsi.Penangkapan dan penanganan periferal penuh: pergerakan kursor mouse, klik kiri, kanan, tengah, klik ganda, dan roda gulir (scroll).Injeksi kombinasi tombol sistem khusus: Penyediaan tombol antarmuka untuk mengirimkan penekanan tombol kombinasi yang biasanya dicegat oleh peramban lokal, seperti Ctrl + Alt + Delete, Alt + Tab, dan tombol logo Windows.Sinkronisasi papan klip (shared clipboard): Pertukaran teks dua arah antara mesin lokal instruktur dan komputer klien target.3.4. Pengawasan Multi-Layar (Grid View) dan Kontrol KelasDasbor Matriks Multi-Layar (Classroom Grid View): Menampilkan mosaik tangkapan layar seluruh komputer lab yang aktif secara bersamaan dengan frekuensi pembaruan adaptif (1–2 frame per detik) untuk menjaga efisiensi lebar pita jaringan.Akses Kendali Satu-Klik: Instruktur dapat mengklik kartu komputer manapun di dasbor matriks untuk langsung memperbesar dan mengambil alih kendali interaktif penuh.Penguncian Masukan (Input Locking): Kemampuan untuk menonaktifkan periferal mouse dan keyboard komputer siswa dari jarak jauh serta menampilkan layar informasi statis (blank screen) saat instruktur memberikan pengarahan.Penyiaran Layar (Teacher Screen Broadcast): Fitur opsional untuk memancarkan layar monitor instruktur ke seluruh layar komputer siswa secara serentak.3.5. Tata Kelola Akses dan Rekaman AuditPembatasan hak akses berbasis peran (RBAC):Superadmin: Konfigurasi sistem global, penambahan lab, manajemen akun pengguna, pengaturan jaringan.Instructor (Dosen/Guru): Eksekusi daya (WoL/Shutdown), kendali jarak jauh interaktif, penguncian layar, pemantauan grid.Lab Assistant: Pemantauan grid pasif (view-only), tanpa wewenang kendali input atau pematian sistem.Pencatatan log jejak audit (audit logging) untuk setiap aksi krusial: pencatatan stempel waktu, ID operator, ID perangkat target, tipe aksi, dan status eksekusi.4. Matriks Kebutuhan Fungsional Perangkat LunakID KebutuhanKomponen FungsionalDeskripsi Kebutuhan TeknisKlasifikasi PrioritasKriteria Penerimaan (Acceptance Criteria)FR-INV-01InventarisasiPendaftaran dan penyuntingan metadata komputer klien (Nama Host, IP, MAC).Wajib (Must-Have)Data tersimpan pada basis data; duplikasi IP/MAC ditolak dengan notifikasi validasi.FR-INV-02InventarisasiPengelompokan perangkat berdasarkan ruangan lab dan koordinat spasial grid meja.Wajib (Must-Have)Kartu workstation muncul pada antarmuka sesuai tata letak fisik ruang laboratorium.FR-INV-03InventarisasiPemantauan keterjangkauan status jaringan secara otomatis (polling heartbeat).Wajib (Must-Have)Perubahan status perangkat (Online/Offline) terdeteksi maksimal dalam 10 detik.FR-PWR-01Manajemen DayaPembangkitan komputer dari kondisi mati menggunakan paket Wake-on-LAN (WoL).Wajib (Must-Have)Komputer yang mendukung WoL menyala dalam waktu 30 detik setelah perintah dikirim.FR-PWR-02Manajemen DayaEksekusi pematian (shutdown) dan mulai ulang (reboot) sistem jarak jauh secara massal.Wajib (Must-Have)Sistem operasi target menutup layanan secara tertib tanpa memicu galat sistem berkas.FR-RMT-01Remote DesktopTampilan streaming desktop berbasis HTML5 Canvas melalui protokol WebSockets.Wajib (Must-Have)Antarmuka desktop target tampil di peramban tanpa instalasi ekstensi atau plugin.FR-RMT-02Remote DesktopPenangkapan dan injeksi event penekanan keyboard serta pergerakan kursor mouse.Wajib (Must-Have)Respons pengetikan dan klik terasa responsif dengan deviasi koordinat kursor nol piksel.FR-RMT-03Remote DesktopPengiriman kombinasi tombol sistem terintersepsi (misal: Ctrl+Alt+Del, Alt+Tab).Wajib (Must-Have)Tombol diterjemahkan menjadi sinyal sistem pada target tanpa memengaruhi jendela lokal.FR-RMT-04Remote DesktopSinkronisasi pertukaran teks papan klip (clipboard) dua arah.Penting (Should-Have)Teks yang disalin di peramban instruktur dapat langsung ditempelkan pada aplikasi target.FR-MON-01PengawasanDasbor matriks pemantauan multi-layar (Grid View) untuk seluruh terminal aktif.Wajib (Must-Have)Menampilkan seluruh komputer dalam satu ruangan secara serentak pada laju 1–2 FPS.FR-MON-02PengawasanTransisi satu-klik dari pemantauan matriks ke kendali interaktif penuh.Wajib (Must-Have)Sesi kendali penuh terbuka dalam tab atau modal terpisah dalam waktu kurang dari 2 detik.FR-LAB-01Manajemen LabPenguncian masukan periferal mouse dan keyboard komputer siswa secara terpusat.Penting (Should-Have)Perangkat masukan siswa terkunci seketika dan menampilkan layar informasi statis.FR-LAB-02Manajemen LabPenyiaran visual desktop instruktur (screen broadcast) ke seluruh terminal siswa.Bernilai Tambah (Could-Have)Layar siswa menampilkan salinan tampilan materi instruktur dengan jeda latensi rendah.FR-SEC-01Keamanan AksesOtentikasi sesi terpusat dengan Kontrol Akses Berbasis Peran (Admin, Dosen, Asisten).Wajib (Must-Have)Pembatasan rute API dan menu visual ditegakkan secara mutlak berdasarkan token pengguna.FR-SEC-02Jejak AuditPerekaman catatan riwayat aktivitas daya, sesi kendali, dan manipulasi konfigurasi.Wajib (Must-Have)Setiap aksi tercatat dengan atribut waktu, operator, ID perangkat, dan status keberhasilan.5. Parameter Non-Fungsional dan Rekayasa KinerjaSistem kendali jarak jauh pada infrastruktur lokal menuntut jaminan keandalan waktu nyata, isolasi keamanan, dan ketahanan konkurensi data.Kategori ParameterBatasan Teknis dan Standar KinerjaLatensi Transmisi InteraktifWaktu tunda transmisi masukan periferal ke respons rendering balik tidak boleh melebihi ambang batas 30 ms pada LAN kabel Gigabit dan 60 ms pada Wi-Fi 5/6.Throughput Data JaringanAliran data sesi kendali interaktif tunggal dibatasi maksimal 3.5 Mbps pada resolusi 1080p. Aliran pemantauan matriks 40 klien simultan dibatasi maksimal 20 Mbps total secara agregat.Kapasitas Konkurensi GatewayServer backend dan daemon gateway (guacd) wajib mampu mempertahankan 60 koneksi sesi pemantauan matriks secara bersamaan dengan pemanfaatan CPU server di bawah 75%.Keamanan Lapisan TransmisiSeluruh lalu lintas peramban ke gateway wajib menggunakan Transport Layer Security (TLS 1.3) pada port HTTPS/WSS. Kredensial akun sistem operasi target dienkripsi menggunakan algoritma AES-256.Ketahanan dan KetersediaanLayanan aplikasi lokal memiliki ketersediaan minimum 99.5% selama jadwal kegiatan praktikum. Kegagalan satu sesi workstation tidak boleh memicu penghentian layanan pada workstation lainnya.Kompatibilitas AntarmukaBerjalan secara bebas kendala fungsional pada seluruh peramban modern berbasis mesin Blink, Gecko, dan WebKit (Google Chrome v100+, Mozilla Firefox v100+, Microsoft Edge v100+).6. Spesifikasi Protokol Jaringan dan Mekanisme Transmisi6.1. Formulasi Muatan Data Paket Bangun Jaringan (Wake-on-LAN)Pembangkitan perangkat keras komputer jarak jauh melalui jaringan lokal mengandalkan standar pensinyalan lapisan tautan data (Data Link Layer) atau dibungkus dalam datagram UDP pada Lapisan Transportasi. Kartu antarmuka jaringan (Network Interface Card / NIC) komputer target mempertahankan pasokan daya siaga (standby power) dari unit catu daya (Power Supply Unit / PSU) melalui jalur rel +5VSB. Dalam status siaga ini, pengontrol Ethernet secara kontinu memindai frame data untuk mencari pola bit spesifik yang didefinisikan sebagai Magic Packet.Struktur muatan paket ajaib tersusun atas urutan pembuka sinkronisasi (synchronization stream) sepanjang 6 byte yang bernilai heksadesimal 0xFF secara penuh, yang secara langsung diikuti oleh pengulangan alamat perangkat keras fisik (MAC Address) target sebanyak tepat 16 kali secara berturutan tanpa jeda byte pemisah:$$\text{Payload}_{\text{WoL}} = (\text{0xFF} \times 6) + (\text{MAC}_{\text{Target}} \times 16)$$Panjang total muatan data adalah tepat 102 byte. Di dalam lingkungan jaringan lokal bertingkat, paket ini dikemas dalam datagram UDP dan dipancarkan ke alamat broadcast subnet terarah (directed subnet broadcast, misal: 192.168.10.255 untuk blok 192.168.10.0/24) menuju port UDP 7 atau port UDP 9. Hal ini memastikan paket dapat melintasi switch jaringan lokal dan mencapai antarmuka fisik target meskipun tabel pemetaan Address Resolution Protocol (ARP) pada switch telah kedaluwarsa akibat komputer target berada dalam kondisi mati dalam durasi lama.6.2. Dinamika RDP Shadowing versus Pemisahan Sesi Konsol WindowsSistem operasi Microsoft Windows varian desktop (Windows 10 dan Windows 11 edisi Professional atau Enterprise) menerapkan kebijakan lisensi yang membatasi interaktivitas grafis hanya pada satu sesi pengguna aktif dalam satu waktu. Ketika inisiasi koneksi Remote Desktop Protocol (RDP) standar diluncurkan menuju port TCP 3389 pada komputer siswa yang sedang aktif bekerja di depan monitor fisik (console session), modul Remote Desktop Services (RDS) secara otomatis memindahkan sesi pengguna fisik ke kondisi terkunci (locked session). Perilaku ini menghalangi skenario pengawasan kelas karena siswa kehilangan visual kerja mereka seketika.Untuk mengatasi batasan tersebut, sistem memanfaatkan fitur bawaan sistem operasi yang dikenal sebagai RDP Session Shadowing. Mekanisme ini beroperasi dengan menempelkan sesi instruktur langsung ke dalam konteks sesi grafis yang telah aktif di layar monitor fisik siswa (Session ID 1 atau sesi konsol). Negosiasi koneksi shadowing diawali melalui antarmuka panggilan prosedur jarak jauh (Remote Procedure Call / RPC) menggunakan pipa bernama (named pipe) SessEnvPublicRpc yang diekspos oleh layanan Remote Desktop Configuration (SessionEnv). Protokol RPC ini menegosiasikan otentikasi hak akses instruktur dan mengalokasikan port komunikasi TCP dinamis dalam rentang port tinggi (high ports) antara 49152 hingga 65535.Setelah saluran data terbentuk, komponen RdpSa (Remote Desktop Shadowing Assistant) pada sistem target menduplikasi aliran grafis sesi konsol secara transparan. Melalui parameter administratif /noConsentPrompt, instruktur dapat melakukan pengawasan langsung tanpa memicu dialog persetujuan yang dapat mengganggu konsentrasi siswa. Apabila intervensi bimbingan teknis diperlukan, parameter kendali /control diaktifkan sehingga instruktur dapat berbagi kendali mouse dan keyboard secara kolaboratif bersama siswa pada ruang kerja visual yang identik.6.3. Alokasi Port Jaringan dan Protokol KomunikasiNomor PortProtokol Lapisan TransportArah Lalu Lintas DataIdentitas Titik Akhir KomunikasiDeskripsi Fungsi Operasional443TCPMasuk (Inbound)Peramban Admin $\rightarrow$ Web ServerAkses antarmuka pengguna aman dan saluran terowongan WSS (WebSocket Secure).4822TCPInternal ServerNode.js Backend $\rightarrow$ Daemon guacdKomunikasi protokol internal Guacamole untuk translasi stream grafis.3389TCP / UDPKeluar (Outbound)Gateway Server $\rightarrow$ Workstation TargetSaluran transmisi data protokol grafis standar Microsoft RDP.49152 – 65535TCPKeluar (Outbound)Gateway Server $\rightarrow$ Workstation TargetRentang port dinamis RPC untuk inisiasi dan transmisi RDP Shadowing.5900TCPKeluar (Outbound)Gateway Server $\rightarrow$ Workstation TargetPort layanan Virtual Network Computing (VNC/RFB) untuk target non-RDP.7 / 9UDPSiaran (Broadcast)Backend Server $\rightarrow$ Subnet BroadcastTransmisi Magic Packet sinyal pembangun daya Wake-on-LAN.5985 / 5986TCPKeluar (Outbound)Backend Server $\rightarrow$ Workstation WindowsAntarmuka WinRM (HTTP/HTTPS) untuk orkestrasi perintah shutdown/restart.22TCPKeluar (Outbound)Backend Server $\rightarrow$ Workstation LinuxSaluran Secure Shell (SSH) untuk eksekusi instruksi operasional sistem Linux.7. Format Token Enkripsi dan Kontrak Protokol GatewayUntuk menghubungkan antarmuka frontend dengan daemon guacd secara aman melalui guacamole-lite, backend menerbitkan token berumur pendek (ephemeral token, kedaluwarsa dalam 60 detik). Klien web tidak pernah menerima kredensial akun target dalam bentuk teks biasa.7.1. Struktur Data JSON Payload TokenJSON{
  "connection": {
    "type": "rdp",
    "settings": {
      "hostname": "192.168.10.15",
      "port": 3389,
      "security": "nla",
      "ignore-cert": true,
      "username": "lab_student",
      "password": "EncryptedPasswordOrKey",
      "width": 1920,
      "height": 1080,
      "dpi": 96,
      "resize-method": "display-update"
    }
  },
  "expires": 1730467200000
}
7.2. Mekanisme Enkripsi dan URL WebSocketPayload JSON dienkripsi pada backend menggunakan algoritma AES-256-CBC dengan kunci rahasia (CYPHER_KEY, string 32 karakter) dan IV acak (atau tetap terdefinisi pada konfigurasi server).Hasil enkripsi diubah menjadi format representasi Base64 yang aman untuk URL (URL-safe Base64).Frontend membuka koneksi WebSocket menggunakan token ini:wss://lab-server.local/api/v1/tunnel/remote?token=<TOKEN_ENKRIPSI_BASE64>
guacamole-lite pada backend memverifikasi masa kedaluwarsa token, mendekripsi payload, dan meneruskan instruksi jabat tangan ke daemon guacd melalui TCP 4822.8. Perancangan Basis Data dan Skema EntitasSkema didefinisikan menggunakan format deklarasi Prisma ORM (schema.prisma) untuk menghasilkan tabel basis data relasional secara otomatis:Code snippetdatasource db {
  provider = "postgresql" // Dapat diubah ke "sqlite" untuk mode pengujian lokal
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPERADMIN
  INSTRUCTOR
  LAB_ASSISTANT
}

enum PowerStatus {
  ONLINE
  OFFLINE
  IN_SESSION
  UNREACHABLE
}

enum ConnectionMode {
  RDP_FULL
  RDP_SHADOW
  VNC
  MOCK_AGENT
}

model Laboratory {
  id               Int           @id @default(autoincrement())
  labName          String        @unique @db.VarChar(64)
  subnetBroadcast  String        @db.VarChar(18) // Misal: 192.168.10.255
  totalCapacity    Int           @default(40)
  createdAt        DateTime      @default(now())
  workstations     Workstation[]

  @@map("laboratories")
}

model Workstation {
  id              Int            @id @default(autoincrement())
  labId           Int
  hostname        String         @db.VarChar(64)
  ipAddress       String         @db.VarChar(45)
  macAddress      String         @unique @db.VarChar(17)
  gridRow         Int            @default(1)
  gridColumn      Int            @default(1)
  osFamily        String         @default("WINDOWS") @db.VarChar(32)
  connectionMode  ConnectionMode @default(RDP_SHADOW)
  powerStatus     PowerStatus    @default(OFFLINE)
  lastHeartbeat   DateTime?
  laboratory      Laboratory     @relation(fields: [labId], references: [id], onDelete: Cascade)
  auditTrails     AuditTrail[]

  @@map("workstations")
}

model User {
  id           Int          @id @default(autoincrement())
  username     String       @unique @db.VarChar(48)
  passwordHash String       @db.VarChar(255)
  fullName     String       @db.VarChar(96)
  role         Role         @default(INSTRUCTOR)
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  auditTrails  AuditTrail[]

  @@map("users")
}

model AuditTrail {
  id            BigInt       @id @default(autoincrement())
  userId        Int
  workstationId Int?
  actionName    String       @db.VarChar(32)
  actionStatus  String       @db.VarChar(16)
  executedAt    DateTime     @default(now())
  metadataJson  String?      @db.Text
  user          User         @relation(fields: [userId], references: [id])
  workstation   Workstation? @relation(fields: [workstationId], references: [id], onDelete: SetNull)

  @@map("audit_trails")
}
9. Spesifikasi Antarmuka Pemrograman Aplikasi (REST API)MetodeJalur Endpoint LayananOtorisasi PeranFormat Masukan Body / QueryDeskripsi Operasional APIPOST/api/v1/auth/loginPublik{ username, password }Otentikasi pengguna dan penerbitan token JWT.GET/api/v1/labsAsisten, Dosen, Admin-Menampilkan daftar seluruh ruangan laboratorium.GET/api/v1/labs/:id/workstationsAsisten, Dosen, AdminURL Param: idMengambil daftar workstation beserta status terkininya.POST/api/v1/workstationsAdmin{ labId, hostname, ipAddress, macAddress, gridRow, gridColumn, osFamily }Mendaftarkan simpul workstation baru.PUT/api/v1/workstations/:idAdminObjek parsial metadataMemperbarui konfigurasi identitas workstation.DELETE/api/v1/workstations/:idAdminURL Param: idMenghapus unit komputer dari inventaris lab.POST/api/v1/power/wolDosen, Admin{ workstationIds: [1, 2, 3] }Mengirim paket WoL ke daftar workstation terpilih.POST/api/v1/power/shutdownDosen, Admin{ workstationIds: [1, 2], force: false }Mengeksekusi pematian sistem operasi jarak jauh.POST/api/v1/power/rebootDosen, Admin{ workstationIds: [1, 2] }Memulai ulang sistem operasi jarak jauh.POST/api/v1/classroom/lockDosen, Admin{ labId: 1, lock: true, message: "Perhatikan Dosen" }Mengunci masukan periferal dan monitor siswa.POST/api/v1/remote/tokenDosen, Admin{ workstationId: 5 }Menghasilkan token terenkripsi AES-256 untuk sesi WebSocket.WS/api/v1/tunnel/remoteDosen, AdminQuery: ?token=<AES256_BASE64>Saluran komunikasi WebSocket dua arah ke gateway guacd.10. Desain Antarmuka Pengguna (UI/UX) dan Alur InteraksiDasbor Matriks Pemantauan (Classroom Grid View):Bilah Atas (Top Header): Penyeleksi Ruang Lab (Lab Selector), metrik ringkasan (misal: "38 Online, 2 Offline"), tombol aksi massal: "Nyalakan Semua (WoL)", "Matikan Semua", "Kunci Semua Layar".Tata Letak Meja (Spatial Grid): Kartu komputer disusun berdasarkan baris dan kolom sesuai denah fisik lab.Komponen Kartu Komputer (PC Card Component):Header kartu: Nama PC, status LED pendar (Hijau = Online, Merah = Offline, Kuning = Transisi).Area tengah: Elemen kanvas miniatur (resolusi 320x180 px) yang memperbarui tangkapan layar setiap 1–2 detik secara adaptif.Footer kartu: Alamat IP dan tombol pintasan (Menu klik kanan: "Remote Control", "Wake-on-LAN", "Shutdown", "Kunci Input").Jendela Kendali Interaktif Penuh (Full-Screen Viewport):Kanvas HTML5 merender layar sistem target dengan penskalaan aspek rasio otomatis (fit to window) atau ukuran asli 1:1.Bilah Kontrol Mengambang (Floating HUD Toolbar):Terletak di sisi tengah atas layar, semi-transparan, dengan fitur auto-hide.Tombol Injeksi Tombol Sistem: Ctrl+Alt+Del, Alt+Tab, Win.Tombol Sinkronisasi Clipboard: Menampilkan modal teks untuk mengirim/menerima papan klip teks.Indikator Latensi (RTT Badge): Menampilkan waktu respons koneksi secara aktual (ms).Tombol Keluar: Memutus sesi WebSocket dan kembali ke Dasbor Matriks.11. Arsitektur Lingkungan Pengujian Tiruan (Mock Lab Simulation Environment)Untuk memfasilitasi pengujian mandiri oleh coding agent (seperti Google Antigravity) tanpa memerlukan perangkat keras fisik, repositori wajib dilengkapi simulator klien laboratorium:11.1. Konfigurasi docker-compose.ymlYAMLversion: '3.8'

services:

# Daemon Penerjemah Protokol Apache Guacamole

  guacd:
    image: guacamole/guacd:latest
    container_name: remote_guacd
    restart: always
    ports:
      - "4822:4822"

# Basis Data PostgreSQL

  database:
    image: postgres:15-alpine
    container_name: remote_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: remote_lab_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

# Simulasi Target Klien Lab 1 (VNC Mock Desktop)

  mock_client_01:
    image: theasp/novnc:latest
    container_name: mock_client_01
    environment:
      DISPLAY_WIDTH: 1280
      DISPLAY_HEIGHT: 720
    ports:
      - "5901:5900" # Expose VNC Port untuk guacd

volumes:
  postgres_data:
11.2. Skrip Peniru Wake-on-LAN dan Heartbeat Target (mock_agent.py)Skrip Python ringan yang disematkan di folder mock-lab/ untuk mendengarkan paket UDP Wake-on-LAN dan merespons ping:Pythonimport socket
import sys

def listen_wol(port=9):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', port))
    print(f"[Mock Agent] Mendengarkan paket Wake-on-LAN pada port UDP {port}...")
    while True:
        data, addr = sock.recvfrom(1024)
        if len(data) == 102 and data.startswith(b'\xff' * 6):
            mac = ':'.join(f'{b:02x}' for b in data[6:12])
            print(f"[Mock Agent] Magic Packet diterima dari {addr} untuk MAC: {mac.upper()}! Status -> BERHASIL BANGUN.")

if __name__ == "__main__":
    listen_wol()
12. Cetak Biru Struktur Direktori Repositori Monorepoapp-remote/
├── docker/
│   └── docker-compose.yml         # Konfigurasi orkestrasi guacd, db, dan mock
├── mock-lab/
│   ├── mock_agent.py              # Simulator WoL listener & ping responder
│   └── README.md                  # Panduan pengujian lingkungan simulasi
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Skema basis data relasional
│   │   └── seed.ts                # Data awal untuk lab dan workstation tiruan
│   ├── src/
│   │   ├── config/                # Konfigurasi env, cipher key, dan port
│   │   ├── controllers/           # Auth, Workstation, Power, Remote Controller
│   │   ├── routes/                # Definisi REST API endpoints
│   │   ├── services/
│   │   │   ├── wolService.ts      # Logika pembentukan Magic Packet UDP
│   │   │   ├── heartbeatService.ts# Pemantau status online/offline rutin
│   │   │   └── cryptoService.ts   # Enkripsi/Dekripsi token AES-256-CBC
│   │   ├── websocket/
│   │   │   └── guacTunnel.ts      # Integrasi guacamole-lite ke guacd TCP
│   │   └── server.ts              # Titik masuk aplikasi backend
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/            # Button, Modal, Navbar, StatusIndicator
│   │   │   ├── dashboard/         # LabGrid, WorkstationCard, ContextMenu
│   │   │   └── remote/            # CanvasViewer, FloatingToolbar, ClipboardModal
│   │   ├── hooks/                 # useGuacamole, useHeartbeatPolling
│   │   ├── services/              # Client API RESTful calls
│   │   ├── stores/                # Zustand state management
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example
├── .gitignore
└── README.md                      # Dokumentasi komprehensif instruksi build
13. Analisis Kendala Infrastruktur Jaringan Lokal dan Mitigasi RekayasaPembatasan Sesi Tunggal Windows Desktop: Sesi RDP reguler akan mengunci layar fisik pengguna. Mitigasi teknis diimplementasikan melalui penyesuaian Group Policy Windows (Computer Configuration -> Administrative Templates -> Windows Components -> Remote Desktop Services -> Remote Desktop Session Host -> Connections -> Set rules for remote control of Remote Desktop Services user sessions) ke opsi "Full Control without user's permission" sehingga mekanisme RDP Shadowing dapat langsung menempel pada sesi konsol aktif.Keandalan Wake-on-LAN pada Wi-Fi: Jalur transmisi nirkabel sering membuang paket siaran UDP akibat fitur isolasi AP. Prosedur mitigasi mengharuskan penggunaan jaringan berkabel Ethernet Cat6 Gigabit untuk PC laboratorium desktop, serta pengaktifan opsi Wake on WLAN (WoWLAN) dengan alamat subnet siaran terarah (directed subnet broadcast) pada access point jika diterapkan pada perangkat laptop.Isolasi Desktop Aman UAC (User Account Control): Dialog UAC beralih ke desktop terisolasi yang dapat menyebabkan tampilan remote membeku. Solusi teknis adalah mendaftarkan modul klien target sebagai Layanan Windows (Windows Service) di bawah akun NT AUTHORITY\SYSTEM dengan atribut interaksi desktop aktif, atau menonaktifkan pengalihan UAC ke Secure Desktop melalui konfigurasi kebijakan grup lab.14. Rencana Implementasi Bertahap (Milestones for Agent Execution)Agen pengembang (Google Antigravity) diinstruksikan untuk mengeksekusi pembangunan perangkat lunak secara sekuensial dengan pola Plan -> Execute -> Verify pada setiap tahapan:Tahap 1: Fondasi Kontainer dan Lingkungan Pengujian (Container & Mock Setup)Buat docker/docker-compose.yml untuk memutar layanan guacd, basis data PostgreSQL, dan kontainer simulator VNC.Buat skrip mock-lab/mock_agent.py dan verifikasi bahwa kontainer serta simulator dapat diakses melalui port jaringan lokal.Tahap 2: Backend Core, Database, dan REST APIInisialisasi proyek Node.js / TypeScript di direktori backend/.Konfigurasi Prisma ORM dengan skema entitas, jalankan migrasi, dan eksekusi seed data awal (1 Lab, 12 Workstations).Bangun REST API otentikasi JWT, manajemen workstation, dan pemicu fungsi Wake-on-LAN (UDP 7/9).Tahap 3: Implementasi Gerbang Terowongan WebSocket (guacamole-lite)Bangun modul enkripsi token AES-256-CBC untuk membungkus konfigurasi host RDP/VNC.Integrasikan guacamole-lite ke server backend untuk meneruskan aliran data WebSocket menuju layanan guacd:4822.Uji koneksi jabat tangan WebSocket menggunakan token uji coba terenkripsi.Tahap 4: Antarmuka Frontend Dasbor Matriks dan Viewport CanvasInisialisasi React + Vite + Tailwind CSS di direktori frontend/.Rancang antarmuka Dasbor Matriks Lab (Grid Meja Spasial) dengan kartu workstation interaktif dan polling status.Integrasikan pustaka guacamole-common-js untuk merender tampilan layar target pada elemen HTML5 Canvas.Tahap 5: Interaktivitas Kendali, Tombol Pintasan, dan ClipboardPasang penangkap event mouse (koordinat, klik, scroll) dan keyboard ke saluran kanvas.Implementasikan bilah kontrol melayang (HUD Toolbar) untuk injeksi tombol pintasan Ctrl+Alt+Del dan sinkronisasi clipboard teks.Tahap 6: Verifikasi Penuh End-to-End (Full Verification)Lakukan pengujian otomatis peramban: pastikan pengguna dapat login, melihat status komputer di dasbor, memicu paket WoL, dan membuka sesi remote control ke mock client hingga layar kanvas berhasil dirender secara responsif.
