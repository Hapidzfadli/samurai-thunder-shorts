# PREVIEW — istana Wu / Sun Tzu

Interpretasi panggung kisah Sun Tzu melatih perempuan istana dalam *Shiji*, bukan rekonstruksi arkeologis pasti. Tata ruang, warna, panji geometris, takhta dan perabot adalah pilihan visual; tidak mengklaim bentuk istana Wu yang terdokumentasi. Hindari menyebut latar ini sebagai Kota Terlarang/arsitektur Ming-Qing.

## Berkas & ekspor
- Generator: `scripts/build_suntzu_glb.py` (memakai helper geometri, UV asli, material Principled dan packed image dari `build_school_glb.py`).
- Aset: `public/models/suntzu-palace.glb`; Y-up, tekstur tertanam, tanpa render Blender.
- CLI: `blender -b --python scripts/build_suntzu_glb.py -- public/models/suntzu-palace.glb`.
- Material kayu merah kusam, panel kayu, tanah, genteng abu dan matras menggunakan UV + packed PNG prosedural 256 px. Tidak bergantung shader prosedural non-glTF.
- Geometri statis digabung per koleksi/material untuk draw call ringan; objek ACTION_* tetap terpisah.

## Tata ruang
Satuan meter. Blender: +Z atas, +Y belakang/utara. THREE: **(X, Z, -Y)**. Jangan konversi dua kali setelah GLTFLoader.
- Kompleks berdinding: Blender X ±18, Y -16…18. Latihan tanah padat X ±8, Y -10…4.
- Balairung di (0,11), lantai tinggi 0.95; dinding berpanel, empat jendela Boolean nyata, fasad tengah terbuka, balok/kaso terlihat, takhta rendah + meja + matras.
- Paviliun komando terbuka di (-13,1), lantai tinggi .44, meja rendah + papan perintah + lampu/guci/panji.
- Gapura di (0,-16): jalur tengah kosong X ±2.5, tinggi aman kamera 2.2. Daun pintu tersimpan terbuka di sisi.
- Genderang di (-8,-3), lonceng perunggu berongga di (10.5,2.5), rak enam tombak di (12,7).
- Lapisan: paving/gapura/panji depan → halaman/paviliun/alat latihan tengah → balairung/dinding/pohon/bukit belakang.

## Lima kamera aman (koordinat THREE)
FOV vertikal derajat, aspect 9/16, near .05, far 250. Tabel berikut adalah waypoint ekspor awal; renderer pratinjau src/SunTzuPreviewWorld.tsx mengganti FOV Hall/Command menjadi 52° dan Training menjadi 55° agar mengikuti batas interior 40–55°. Posisi ini menghindari tembok/tiang; framing karakter tetap perlu still-check parent. Kamera sengaja memilih bagian latar, bukan memaksa seluruh kompleks masuk frame vertikal.

| Nama waypoint | Posisi | LookAt | FOV |
|---|---|---|---|
| WP_Cam_Exterior | (0,13,40) | (0,2.3,-1) | 52 |
| WP_Cam_Hall | (1.1,2.6,-7.7) | (0,1.9,-13.6) | 57 |
| WP_Cam_Training | (4,3.6,12) | (-.5,1.2,1) | 57 |
| WP_Cam_Command | (-11,2.6,5) | (-13,1.45,-1.3) | 56 |
| WP_Cam_PropsDetail | (8.7,2,1) | (10.5,1.5,-2.5) | 48 |

Setiap kamera memiliki WP_Target_* dan extras fov/target_three. WP_Cam_FlyIn_0…6: jalur tengah dari depan gapura sampai balairung; interpolate posisi dan lookAt terpisah dengan halus, jangan interpolasi ke kamera detail menembus dinding.

## Camera JSON siap salin (THREE)
```json
{
  "exterior":{"position":[0,13,40],"target":[0,2.3,-1],"fov":52},
  "hall":{"position":[1.1,2.6,-7.7],"target":[0,1.9,-13.6],"fov":57},
  "training":{"position":[4,3.6,12],"target":[-0.5,1.2,1],"fov":57},
  "command":{"position":[-11,2.6,5],"target":[-13,1.45,-1.3],"fov":56},
  "props":{"position":[8.7,2,1],"target":[10.5,1.5,-2.5],"fov":48}
}
```

## Titik karakter (THREE, titik kaki kecuali Raja duduk)
- WP_Char_SunTzu_Training: (0,.14,-1)
- WP_Char_CaptainA: (-2.5,.14,2)
- WP_Char_CaptainB: (2.5,.14,3)
- WP_Char_King: (0,1.4,-14.15), waypoint asal acuan takhta. Preview menempatkan raja berdiri di lantai (.9,.99,-13.5), tidak berdiri di atas kursi.
- WP_Char_SunTzu_Hall: (0,.99,-10)
- WP_Char_SunTzu_Command: (-13,.44,-.1)
- Tambahkan barisan figuran di tanah X -5…5, Y THREE 0…7; atur bertingkat untuk frame vertikal.

## Benda aksi
Nama mesh tetap: ACTION_BronzeBell, ACTION_BellMallet/Head, ACTION_CommandDrum, ACTION_Drumstick0/1, ACTION_Spear_0…5 + ACTION_SpearHead_0…5, ACTION_CommandBaton, ACTION_OrderTablet0…5, ACTION_BambooSlip_0…11, ACTION_KingCup, ACTION_GateLeaf-1/1. Komponen satu benda (kepala tombak, ACTION_Drum_Hide*, ACTION_Drum_Stud*, ACTION_Bell_Boss*, ACTION_GateLeaf_Brace*, ACTION_BambooSlip_Cord*) perlu diparent/group oleh penggerak sebelum benda utuh dipindah. Origin beberapa mesh mengikuti helper/world-space; gunakan THREE.Group.attach untuk menjaga world transform sebelum animasi. Mesh statis lain digabung dan bukan target animasi. Pakai nama node glTF; GLTFLoader dapat menyanitasi tanda baca, jadi traversal atau getObjectByName sesuai hasil loader.

## Cahaya Remotion
Aset tidak membawa cahaya/kamera aktif. Gunakan hemisphere lembut (.8–1.2) + directional hangat dari depan kiri, intensitas sesuai color management parent; shadow map 1024, ambient/area fill balairung agar interior tidak hitam. Matras/tekstil matte, perunggu metalness .55. Tidak ada animasi/audio/video penuh.

## Verifikasi
AST Python lolos. Ekspor headless berhasil pada Blender 5.0.1 (exit 0). GLB header/version/length valid, delapan gambar tertanam via bufferView, delapan material bertekstur; waypoint kamera dan extras FOV/lookAt diperiksa dari JSON GLB. Sekitar 18.5k triangles; draw-call statis dibatasi dengan merge. Peringatan library Draco tidak tersedia tidak memblokir ekspor biasa (tidak memakai Draco). Tidak ada render gambar Blender atau still QA visual di lingkup ini.
