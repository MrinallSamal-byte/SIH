# AapdaSetu — Disaster Management & Emergency Response Platform

> Branch **`divyanshu`** — the AI damage-assessment stack, backend integration module, and supporting docs.
> Main team development lives on [`main`](https://github.com/MrinallSamal-byte/SIH).

## Repository Structure

```
SIH/
├── ai-service/                          # Damage-assessment AI service (FastAPI + ResNet50, ONNX runtime)
│   ├── app/                             #   FastAPI app: EXIF validation, pHash dedup, classifier, compensation
│   ├── training/                        #   Training pipeline: dataset prep, train, eval, ONNX export
│   ├── demo/                            #   Interactive browser demo (served at /)
│   ├── checkpoints/                     #   Eval reports + class mapping (weights live on Hugging Face)
│   ├── bootstrap.py                     #   Renders start command: pulls weights from HF, launches uvicorn
│   ├── render.yaml                      #   Render.com deployment blueprint
│   └── requirements-deploy.txt          #   Production dependencies
│
├── server/                              # Damage module for the Node/Express backend (reference copy)
│   ├── src/controllers/                 #   damage.controller.js
│   ├── src/routes/                      #   damage.route.js
│   ├── src/lib/                         #   zod validators
│   └── prisma/                          #   DamageReport schema
│
├── bitchat/                             # Vendored BitChat iOS/macOS app (offline mesh reference, Unlicense)
│
├── docs/
│   ├── BACKEND_HANDOFF.md               #   Integration guide for the backend team
│   └── aapdasetu-software-only-master.txt   # Original 20-feature master plan
│
├── .gitignore
├── LICENSE                              # MIT
└── README.md
```

## ai-service — Damage Assessment AI

ResNet50 classifier grading property damage into **MINOR / MAJOR / DESTROYED**, with
EXIF authenticity checks, perceptual-hash duplicate detection, NDRF/SDRF compensation
estimation, and fraud flags. Test accuracy **98.36%** on a leakage-audited holdout split.

| Item | Location |
|---|---|
| Live API (Render) | <https://aapdasetu-damage-api.onrender.com> (demo UI at `/`, Swagger at `/docs`) |
| Model weights (`best.pt`, `best.onnx`, eval artifacts) | 🤗 [Divyanshu-Kumar19/aapdasetu-damage-assessment](https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment) |
| Training dataset (2,400 images) | 🤗 [Divyanshu-Kumar19/aapdasetu-damage-dataset](https://huggingface.co/datasets/Divyanshu-Kumar19/aapdasetu-damage-dataset) |

### Run locally

```bash
cd ai-service
pip install -r requirements.txt

# one-time: fetch weights from Hugging Face
hf download Divyanshu-Kumar19/aapdasetu-damage-assessment best.pt --local-dir ./checkpoints

python run.py        # http://localhost:8000
```

### Deploy (Render)

Auto-deploys from this branch. Start command `python bootstrap.py` downloads the ONNX
weights from Hugging Face on boot (torch is not installed in production — inference runs
on `onnxruntime` to fit the 512 MB free tier). See [`ai-service/render.yaml`](ai-service/render.yaml)
for the full blueprint and [`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md) for the
API contract.

## server — Backend Damage Module

Reference implementation of the damage-report flow for the Node/Express + Prisma backend:
photo upload → Cloudinary → AI assessment → `DamageReport` persistence → admin review.
It is a copy-to-integrate module, not a standalone app — integration steps are documented
in [`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md).

## bitchat — Vendored Reference

Unmodified copy of the open-source [BitChat](https://github.com/permissionlesstech/bitchat)
iOS/macOS app (Bluetooth mesh + Nostr, Noise Protocol), included as a reference for
offline peer-to-peer messaging. Public domain under the Unlicense — not original work of
this project.

## License

MIT — see [LICENSE](LICENSE).
