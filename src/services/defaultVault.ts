import { VaultFile } from '../types';

export const DEFAULT_VAULT_FILES: VaultFile[] = [
  {
    id: 'review-1-ppt',
    name: 'Review-I - Bias-Aware Dynamic Layerwise Pruning.md',
    path: 'Presentations/Review-I - Bias-Aware Dynamic Layerwise Pruning.md',
    folder: 'Presentations',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    content: `---
title: Review-I - Bias-Aware Dynamic Layerwise Pruning
tags: [presentation, ai, fairness, pruning, edge-computing, medical-triage]
created: 2026-10-12
course: CDS3007 - Data Clinic
candidate: SYED AMAAN AHMED (23MIP10121)
supervisor: Dr M.K. Jayanthi Kannan
status: review-1
---

# Review-I
## Bias-Aware Dynamic Layerwise Pruning
### Fairness-Preserving Layerwise Compression of LLMs for Edge-Deployed Medical Triage Assistants

**Project Course Code**: \`CDS3007\`  
**Project Course Name**: \`Data Clinic\`  

> [!NOTE]
> **2026 Data Clinic AI Clinic** · Review 1 PPT Template by Dr MK Jayanthi Kannan

---

# Project Details & Candidate Information

### 👨‍🎓 Candidate
- **Name**: **SYED AMAAN AHMED**
- **Registration No**: \`23MIP10121\`
- **E-mail**: \`syed.23mip10121@vitbhopal.ac.in\`
- **Mobile**: \`+91 7470467690\`

### 👨‍🏫 Supervisor
- **Supervisor**: **Dr M.K. Jayanthi Kannan**
- **Designation**: Professor, School of Computing Science and Artificial Intelligence (SCAI)
- **Institution**: 2026 Data Clinic AI Clinic

---

# Introduction

Rural and low-resource healthcare settings increasingly need **offline, on-device AI assistants** for preliminary patient triage, where cloud connectivity is unreliable or completely absent.

> [!TIP]
> **What is Medical Triage?**
> A systematic process of sorting and prioritizing patients based on the urgency of their medical condition to optimize clinical care and resource allocation.

- Running an LLM on resource-constrained edge hardware requires significant compression, typically **pruning**.
- Standard pruning methods such as **Wanda [1]** and **Dynamic Layerwise Pruning (DLP) [2]** optimize *solely* for perplexity and general task performance.
- **Core Vision**: This project explores the intersection of model compression and AI fairness, aiming to develop a pruning method that reduces model size for edge deployment — specifically for offline medical triage assistants — **without amplifying demographic bias** in the process.
- Related to [[Modern Architecture]] and [[Zettelkasten Method]].

---

# Problem Statement

> [!WARNING]
> Standard pruning methods can **silently amplify demographic bias [3][4][5]**, even while perplexity and conversational fluency remain unaffected — because fairness is never measured during the pruning process itself.

### Key Problem Dimensions:
1. **The Edge Dilemma**: Rural/low-resource healthcare clinics rely on offline, on-device AI assistants for preliminary triage due to lack of cloud connectivity. This necessitates compressing LLMs through pruning to run on low-power edge hardware.
2. **Silent Bias Amplification**: Pruning causes disparate impact across demographic groups (gender, race, age, socioeconomic background).
3. **Absence of Layer-wise Fairness Allocation**: Existing fairness-aware pruning methods operate only at the fine-grained weight level or on isolated neurons/heads (e.g., Debias-SparseGPT [7] applies uniform per-layer sparsity).
4. **Lack of Clinical Edge Validation**: To our knowledge, no existing method modifies the layer-wise sparsity allocation of Dynamic Layerwise Pruning with a fairness signal, and **none is validated under edge-deployment constraints in a clinical triage setting**.

---

# Objectives

1. **Baseline Replication**: Reproduce standard pruning methods (Wanda, DLP) and confirm the bias-amplification effect on our own models and hardware.
2. **Dual Calibration**: Build a calibration pipeline using both standard language data (C4, WikiText-2) and fairness-probe data (BBQ, HH-RLHF).
3. **Fisher-Information Scoring**: Implement a sensitivity-scoring mechanism that identifies which layers are fairness-critical and should be protected from aggressive pruning.
4. **Combined Pruning Algorithm and Benchmarking**: Integrate the above into **BA-DLP** and benchmark it against Wanda, DLP, and Debias-SparseGPT on perplexity, SRS, Triage Fairness Gap, latency, and compression ratio.
5. **Domain Validation & Publication**: Evaluate the method in a medical triage context and publish results in a **Scopus-indexed venue**.

---

# Domain Analysis

- **Primary Domain**: Artificial Intelligence / Machine Learning — Model Compression & Efficient Deep Learning, with a secondary focus on AI Fairness & Ethics.
- **Applied Domain**: Healthcare — Edge AI for Medical Triage Assistants.
- **Why This Domain**:
  - Rural and low-connectivity clinics represent a genuine, growing use case for offline LLM assistants.
  - Unlike cloud-hosted models, edge-deployed models **must be compressed**, and compression is exactly where fairness risk is highest and least monitored.
  - This provides a concrete, high-stakes evaluation context rather than an abstract fairness claim.
- **Field Classification**:
  Computer Science & Engineering \$\\rightarrow\$ Artificial Intelligence / Machine Learning \$\\rightarrow\$ Efficient AI / Edge Computing / Trustworthy AI.

---

# Hardware Configuration of Project

### 🖥️ Development & Training Hardware
- **GPU**: Google T4, Single consumer GPU, RTX 4060 / RTX 4090 class (\$8\\text{--}24\\text{ GB}\$ VRAM)
- **RAM**: \$16\\text{--}32\\text{ GB}\$ system memory recommended
- **Storage**: \$\\sim 20\\text{ GB}\$ free space (model checkpoints + dataset caches)

### 📱 Target Deployment Hardware (Evaluation Only)
- **Edge/Low-Power Class**: Representative of rural clinic hardware (e.g., low-power inference board or laptop-class CPU/ARM).
- **Purpose**: Used strictly to benchmark post-pruning latency, memory footprint, and throughput — not for training.

### 🚀 Scale-Up (Optional)
- **Cluster Access**: University GPU cluster / A100-class GPU for validating larger models (Mistral-7B, Gemma-2-9B) beyond the primary \$1.8\\text{--}4\\text{B}\$ proxy-model track.

---

# Software Configuration and Datasets

### 🛠️ Software Stack
- **Language**: Python 3.10+
- **Deep Learning**: PyTorch
- **Ecosystem**: HuggingFace \`transformers\`, \`datasets\`, \`accelerate\`
- **Sparse Inference**: \`sparseml\` / \`DeepSparse\` (sparse inference benchmarking)
- **Config & Versioning**: YAML configuration management, Git version control

### 📚 Datasets
- **C4 / WikiText-2**: General calibration and perplexity evaluation.
- **Anthropic HH-RLHF**: Fairness/alignment-oriented calibration data.
- **BBQ (Bias Benchmark for QA)**: Demographic bias evaluation benchmark.
- **Public Medical Q&A**: MedQA, PubMedQA — domain-specific triage evaluation layer.

> [!NOTE]
> All datasets are public and freely downloadable — no licensing approval or clinical ethics-board review required, since no real patient data is used.

---

# Front End, Back End Database Description

This project is a **research prototype** rather than a deployed commercial application:

### ⚙️ Model Layer (Equivalent to "Back End")
- Pruned LLM checkpoint + inference engine (\`DeepSparse\` / \`sparseml\`), served via a lightweight local inference script.

### 🖥️ Interface Layer (Equivalent to "Front End")
- A minimal command-line or notebook-based interactive interface for running triage-style queries against the pruned model for demonstration purposes.

### 💾 Data Layer (Equivalent to "Database")
- Flat-file storage: calibration datasets, evaluation results, and experiment logs stored as structured CSV/JSON (\`results/experiments.csv\`), not a relational database, as the project output is experimental empirical data.

---

# Datasets Repositories & Access Links

| Dataset | Type | Source & Repository |
| :--- | :--- | :--- |
| **BBQ** | Fairness Evaluation Benchmark | [https://huggingface.co/datasets/heegyu/bbq](https://huggingface.co/datasets/heegyu/bbq) |
| **Anthropic HH-RLHF** | Helpful & Harmless Alignment | [https://huggingface.co/datasets/Anthropic/hh-rlhf](https://huggingface.co/datasets/Anthropic/hh-rlhf) |
| **C4 / WikiText-2** | Standard Language Calibration | [https://huggingface.co/datasets/Salesforce/wikitext](https://huggingface.co/datasets/Salesforce/wikitext) |
| **MedQA / PubMedQA** | Domain Triage Evaluation Layer | Public NCBI & MedQA Repositories |

---

# Architecture Diagram: BA-DLP Pipeline

![BA-DLP Pipeline: Fairness-Aware Model Pruning and Evaluation](/assets/image4.png)

### 🔄 End-to-End Pipeline Workflow:
1. **Input**: Patient symptoms & demographic context.
2. **Base LLM**: Proxy models (Qwen-1.5-1.8B / Phi-3-mini).
3. **Dual Calibration Module**:
   - Standard Language Batch (C4/WikiText)
   - Fairness-Probe Batch (BBQ / HH-RLHF / Triage templates)
4. **Fisher-Information Sensitivity Scoring**: Per-layer sensitivity estimation to fairness loss.
5. **Combined Pruning Score**: Blended via weight \$\\lambda\$ with DLP importance.
6. **BA-DLP Pruned Model**: Non-uniform layerwise sparse model.
7. **Evaluation Suite**: Perplexity, SRS / Triage Fairness Gap, Latency/Throughput, Compression Ratio.
8. **Output**: Compressed, fairness-evaluated model ready for edge deployment.

---

# Literature Review: Paper 1

### Debias-SparseGPT: Bias-Aware Pruning for Large Language Models

| Dimension | Details |
| :--- | :--- |
| **Bibliometrics** | **Authors**: Proskurina, Metzler, Gourru, Velcin<br>**Venue**: EMNLP 2026 \\| **arXiv**: 2609.02496 |
| **Objective** | Put a fairness objective directly into LLM pruning (claims to be the first), reducing bias at the same cost as SparseGPT. |
| **Technology** | SparseGPT with a bias-aware Hessian.<br>Calibration: StereoSet pro-/anti-stereotypical pairs.<br>Evaluation: UnQover, BBQ, CrowS-Pairs; 3.8–9B models on 2×A100-80GB. |
| **Methodology** | Replaces the Hessian with \$H = X_0 X_0^T + X_1 X_1^T + 2\\Delta X \\Delta X^T\$ (paired-input term). Changes both mask selection and weight update, at SparseGPT complexity. The same target sparsity is applied to all seven matrices in every layer. |
| **Strengths** | Large gains on LLaMA at 1:4 sparsity (35.6 \$\\rightarrow\$ 60.5). Throughput 27.54 \$\\rightarrow\$ 73.05 tok/s at 2:4 on A100, identical to SparseGPT. |
| **Weaknesses** | **Uniform per-layer sparsity**. Weak at 50% (LLaMA BBQ 49.7 \$\\rightarrow\$ 46.2). Needs equal-length paired data; perplexity nearly doubles at 2:4 until UltraChat is mixed in. English-only, generic stereotypes, no clinical or edge evaluation. Layer-wise analysis left as future work. |

---

# Literature Review: Paper 2

### Less Is More? Examining Fairness in Pruned LLMs for Summarising Opinions

| Dimension | Details |
| :--- | :--- |
| **Bibliometrics** | **Authors**: Huang et al.<br>**Venue**: EMNLP 2025 |
| **Objective** | Examine how pruning affects fairness in opinion summarisation and propose a fairness-aware pruning criterion (HGLA). |
| **Technology** | Gradient–activation pruning criterion (HGLA).<br>**Granularity**: Parameter level.<br>**Evaluation**: Opinion summarisation only. |
| **Methodology** | Scores parameters with a gradient–activation criterion that carries a fairness signal, then prunes at the parameter level. |
| **Strengths** | Earlier fairness-aware pruning result (EMNLP 2025); not cited by Debias-SparseGPT. |
| **Weaknesses** | Parameter-level, **not layer sparsity allocation**. Summarisation only. No edge latency or memory evaluation. No clinical validation. (Abstract-level reading; verify against full text.) |

---

# Literature Review: Paper 3

### Fairness Pruning: Locating Demographic Bias in GLU-MLP Layers

| Dimension | Details |
| :--- | :--- |
| **Bibliometrics** | **Authors**: Martra et al.<br>**Year**: 2026 \\| **arXiv**: 2607.28319 (preprint) |
| **Objective** | Locate where demographic bias sits in GLU-MLP layers and prune the neurons responsible. |
| **Technology** | Structural pruning of MLP neurons.<br>**Fairness Signal**: Differential activations. |
| **Methodology** | Compares activations on demographically contrasting inputs to find bias-linked neurons, then removes them structurally. |
| **Strengths** | Localises bias at the neuron level inside MLP layers. |
| **Weaknesses** | Neuron-level, **not layer sparsity allocation**. No edge or clinical evaluation. Preprint, not yet peer-reviewed. (Abstract-level reading; verify against full text.) |

---

# Literature Review: Paper 4

### Attention Pruning: Automated Fairness Repair via Simulated Annealing

| Dimension | Details |
| :--- | :--- |
| **Bibliometrics** | **Authors**: Dasu et al.<br>**Year**: 2025 \\| **arXiv**: 2503.15815 (preprint) |
| **Objective** | Repair unfair model behaviour automatically by removing attention heads. |
| **Technology** | Attention-head removal.<br>**Search**: Surrogate model + simulated annealing. |
| **Methodology** | A surrogate model approximates the fairness effect of removing heads; simulated annealing searches for which heads to prune. |
| **Strengths** | Automated, search-based fairness repair. |
| **Weaknesses** | Head-level, **not layer sparsity allocation**. No edge or clinical evaluation. Preprint. (Abstract-level reading; verify against full text.) |

---

# Project Schedule & Milestone Plan

| Phase | Months | Key Deliverables & Research Work |
| :--- | :---: | :--- |
| **Baselines** | **1–2** | Reproduce Wanda and DLP; confirm pruning-induced bias on our models and hardware |
| **Calibration** | **1–2** | Dual calibration pipeline; triage-style paired prompts and symptom templates |
| **Debias-SparseGPT Baseline** | **2–3** | Adapt the public code to the chosen models; verify baseline correctness |
| **BA-DLP** | **3–4** | Fisher sensitivity scoring and combined allocation; literature re-check at month 6 |
| **Experiments** | **4–6** | Full benchmark, ablations, edge latency and memory; literature re-check at month 9 |
| **Validation & Paper** | **6–12** | Medical triage validation, writing and submission to a Scopus-indexed venue |

---

# Research Methodology & Algorithmic Technique

Based on literature review papers, BA-DLP introduces a **retraining-free, layer-allocation algorithm**:

1. **Baseline Replication**: Run Wanda and DLP on Qwen1.5-1.8B and Phi-3-mini; empirically confirm pruning-induced bias amplification.
2. **Dual Calibration**: 
   - Pass 1: Standard language data (C4 / WikiText-2).
   - Pass 2: Fairness probes (paired demographic prompts, BBQ-style items, HH-RLHF, triage symptom templates).
3. **Fisher-Information Scoring**: Estimate each layer's sensitivity to a fairness objective without full backward retraining:
   \$\$F_l = \\mathbb{E}\\left[ \\left( \\nabla_{\\theta_l} \\mathcal{L}_{\\text{fair}} \\right)^2 \\right]\$\$
4. **Combined Allocation**: Blend DLP general importance with fairness sensitivity using weight \$\\lambda\$:
   \$\$\\text{Score}_l = (1 - \\lambda) \\cdot \\text{Score}_{\\text{DLP}}(l) + \\lambda \\cdot \\text{Score}_{\\text{Fairness}}(l)\$\$
   Allocate non-uniform per-layer sparsity budgets without any costly retraining.
5. **Joint Evaluation**: Benchmark against Wanda, DLP, and Debias-SparseGPT; ablate Fisher vs. \$\\Delta X\$ sensitivity and non-uniform vs. uniform allocation.

---

# Research Gap & Issues to be Solved

> [!IMPORTANT]
> Existing literature leaves 5 critical gaps at the intersection of pruning, fairness, and edge computing:

1. **Uniform Per-Layer Sparsity**: Debias-SparseGPT [7] applies one rigid target sparsity to every layer; none of [7]–[10] allocates sparsity per layer with a fairness signal.
2. **Weak at High Sparsity**: Gains in [7] are model-specific and degrade at \$50\\%\$ sparsity (LLaMA BBQ drops from \$49.7 \\rightarrow 46.2\$), yet edge deployment strictly demands high sparsity.
3. **Generic, Non-Clinical Evaluation**: Existing works use StereoSet calibration, English-only text, and abstention metrics. None provides a counterfactual clinical triage fairness measure.
4. **Datacenter-Scale Only**: Prior benchmarks evaluate \$3.8\\text{--}9\\text{B}\$ models on \$2 \\times \\text{A100}\$ GPUs; no sub-4B models and no edge CPU/ARM latency or memory measurements.
5. **High Cost & Data Dependence**: Hessian-based updates require equal-length paired sequences. BA-DLP is **retraining-free and allocation-based**.

---

# Proposed Functional Modules

- **Module 1: Data & Calibration**: General and fairness-probe calibration sets, including triage-style paired prompts.
- **Module 2: Fisher Sensitivity Scoring**: Per-layer fairness-sensitivity scores from the fairness calibration pass.
- **Module 3: BA-DLP Allocation & Pruning**: Blends DLP importance with fairness sensitivity (\$\\lambda\$) to set per-layer sparsity.
- **Module 4: Evaluation**: Perplexity, SRS (BBQ), Triage Fairness Gap, compression ratio.
- **Module 5: Edge Benchmarking & Triage Validation**: Real latency, throughput, and memory on low-power hardware.

---

# Expected Efficiency & Result Analysis Targets

> [!TIP]
> These are project engineering targets to be validated empirically:

### ⚖️ Fairness
- Lower bias amplification (SRS, Triage Fairness Gap) than Wanda and DLP at the exact same sparsity level.

### 📈 Quality & Perplexity
- Perplexity comparable to standard DLP; compared directly with Debias-SparseGPT, especially at \$50\\%\$ unstructured and \$2:4\$ semi-structured sparsity.

### ⚡ Edge Efficiency
- Significantly reduced latency and memory footprint on low-power hardware (laptop CPU / Raspberry Pi / ARM) at equivalent compression ratios.

---

# Key Findings & Contributions

1. **Layer-Level Fairness Allocation**: First framework to extend Dynamic Layerwise Pruning with a fairness signal without retraining.
2. **Fisher-Based Sensitivity**: Theoretical and empirical sensitivity scoring, ablated against the \$\\Delta X\$-style signal of Debias-SparseGPT.
3. **Clinical Triage Benchmark**: Novel paired-calibration set and counterfactual *Triage Fairness Gap* metric for medical settings.
4. **Edge-Scale Validation**: Empirical benchmarks on sub-4B models (Qwen-1.8B, Phi-3-mini) with real hardware latency and RAM measurements.
5. **High-Sparsity Robustness**: Preserving fairness at \$50\\%\$ and \$2:4\$ sparsity where existing methods falter.
6. **Open Science**: Reproducible codebase and publication in a **Scopus-indexed journal/conference**.

---

# Conclusion

- **Compression for edge medical triage assistants must not amplify demographic bias**, yet conventional pruning pipelines never measure fairness during compression.
- Fairness-aware pruning has only recently begun at the weight level; **BA-DLP brings it to the layer-allocation level of DLP, completely retraining-free**.
- Comprehensive validation spans low-power edge hardware and clinical triage scenarios, benchmarked against Debias-SparseGPT.
- **Immediate Next Steps**: Baseline replication, dual calibration pipeline construction, and Fisher sensitivity scoring.

---

# References

- **[1]** Sun, M., Liu, Z., Bair, A., Kolter, J.Z. (2024). *A Simple and Effective Pruning Approach for Large Language Models*. **ICLR 2024**.
- **[2]** Chen, X., et al. (2025). *DLP: Dynamic Layerwise Pruning in Large Language Models*. **ICML 2025 (PMLR)**.
- **[3]** Ramesh, K., Chavan, A., Pandit, S., Sitaram, S. (2023). *A Comparative Study on the Impact of Model Compression Techniques on Fairness in Language Models*. **ACL 2023**, 15762–15782.
- **[4]** Sharma, V., Pau, D.P., Cano, J. (2025). *Biases in Edge Language Models: Detection, Analysis, and Mitigation*. **Proc. EDGE AI Research Symposium**.
- **[5]** Tran, C., et al. (2022). *Pruning Has a Disparate Impact on Model Accuracy*. **NeurIPS 35**.
- **[6]** Parrish, A., et al. (2022). *BBQ: A Hand-Built Bias Benchmark for Question Answering*. **Findings of ACL 2022**, 2086–2105.
- **[7]** Proskurina, I., Metzler, G., Gourru, A., Velcin, J. (2026). *Debias-SparseGPT: Bias-Aware Pruning for Large Language Models*. **EMNLP 2026**. arXiv:2609.02496.
- **[8]** Huang, N., et al. (2025). *Less Is More? Examining Fairness in Pruned Large Language Models for Summarising Opinions*. **EMNLP 2025**.
- **[9]** Martra, P., et al. (2026). *Fairness Pruning: Locating Demographic Bias in GLU-MLP Layers via Differential Activations*. **arXiv:2607.28319** (preprint).
- **[10]** Dasu, V.A., et al. (2025). *Attention Pruning: Automated Fairness Repair of Language Models via Surrogate Simulated Annealing*. **arXiv:2503.15815** (preprint).

---

# Thank You!

### Questions & Discussion

**Candidate**: Syed Amaan Ahmed (\`23MIP10121\`)  
**E-mail**: \`syed.23mip10121@vitbhopal.ac.in\`  
**Supervisor**: Dr M.K. Jayanthi Kannan, Professor SCAI  

> [!NOTE]
> Review-I Presentation · **CDS3007: Data Clinic**`
  },
  {
    id: 'welcome',
    name: 'Welcome to Obsidian.md',
    path: 'Welcome to Obsidian.md',
    folder: '',
    updatedAt: Date.now(),
    createdAt: Date.now() - 86400000 * 2,
    content: `---
title: Welcome to Obsidian
tags: [welcome, pkm, obsidian]
created: 2026-10-11
status: active
---

# Welcome to your Modern Obsidian Knowledge Base

Obsidian is a powerful, extensible knowledge base that works on top of a local folder of plain-text Markdown files. Making connections between ideas is the key to expanding your mind.

> [!TIP]
> Press **Ctrl+O** (or **Cmd+O**) at any time to open the **Quick Switcher**, or **Ctrl+P** / **Cmd+P** to open the **Command Palette**!

---

## ⚡ Key Core Features

1. **Bi-directional Linking**: Link any note using double brackets like [[Zettelkasten Method]] or [[Second Brain]].
2. **Interactive Graph View**: Visualize every note as a physics-driven node in your personal knowledge graph.
3. **Live Preview Editor**: Write in clean Markdown with rendered headers, interactive checklists, code blocks, and math!
4. **Local-First & Private**: Your notes belong to you. Open any local folder on your computer or export your entire vault as a ZIP file.

> [!NOTE]
> Try clicking on any link like [[Markdown Cheat Sheet]] to navigate, or **Ctrl+Click** on a link to open it in a new tab!

## 🧠 Getting Started

- Learn the timeless note-taking technique: [[Zettelkasten Method]]
- Explore digital personal knowledge management: [[Second Brain]]
- Check your current tasks in [[Active Projects]]
- See how to format notes with [[Markdown Cheat Sheet]]
- Open today's journal entry in [[Daily Notes]]

---

### Daily Habits
- [x] Set up new Obsidian workspace
- [x] Connect thoughts with [[Zettelkasten Method]]
- [ ] Explore the interactive Graph View
- [ ] Create your first custom note!
`
  },
  {
    id: 'zettelkasten',
    name: 'Zettelkasten Method.md',
    path: 'Zettelkasten Method.md',
    folder: '',
    updatedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 3,
    content: `---
title: Zettelkasten Method
tags: [productivity, zettelkasten, pkm]
author: Niklas Luhmann
---

# The Zettelkasten Method

The **Zettelkasten** (German for "slip box") is a knowledge management and note-taking method pioneered by sociologist Niklas Luhmann, who wrote more than 70 books and 400 scholarly articles using it.

> [!QUOTE]
> "One cannot think without writing." — Niklas Luhmann

## 🧩 The Three Types of Notes

### 1. Fleeting Notes
Temporary thoughts, quick ideas jotted down during the day without friction. These are typically captured in your [[Daily Notes]].

### 2. Literature Notes
Summaries of what you read, watch, or listen to. Always written in your own words, with proper citations.

### 3. Permanent Notes
Self-contained, atomic ideas that survive the test of time. Each permanent note contains **one single idea** and is heavily linked to other notes, such as [[Second Brain]] and [[Welcome to Obsidian]].

---

## 🕸️ How Links Create Insight
Instead of rigid folders, you link notes horizontally:
- A note about cognitive load links to [[Modern Architecture]]
- A note about mental models links to [[Second Brain]]

When you view your **Graph View**, clusters of related notes emerge organically.
`
  },
  {
    id: 'second-brain',
    name: 'Second Brain.md',
    path: 'Second Brain.md',
    folder: '',
    updatedAt: Date.now() - 7200000,
    createdAt: Date.now() - 86400000 * 4,
    content: `---
title: Building a Second Brain
tags: [pkm, framework, productivity]
author: Tiago Forte
---

# Building a Second Brain (BASB)

A **Second Brain** is an external, digital repository for your ideas, insights, and references to free up your biological brain for creativity and problem-solving.

> [!IMPORTANT]
> Your brain is designed for having ideas, not for holding them!

## The C.O.D.E. Framework

| Stage | Action | Description |
| :--- | :--- | :--- |
| **C** | **Capture** | Keep what resonates from articles, books, and meetings |
| **O** | **Organize** | Save notes based on actionability rather than topic |
| **D** | **Distill** | Progressively summarize your notes down to their core essence |
| **E** | **Express** | Turn your notes into tangible outputs and [[Active Projects]] |

## 🔗 Related Notes
- Intersects directly with the [[Zettelkasten Method]]
- Implemented in software design: [[Modern Architecture]]
- Quick reference: [[Welcome to Obsidian]]
`
  },
  {
    id: 'active-projects',
    name: 'Active Projects.md',
    path: 'Projects/Active Projects.md',
    folder: 'Projects',
    updatedAt: Date.now() - 1800000,
    createdAt: Date.now() - 86400000 * 1,
    content: `---
title: Active Projects
tags: [projects, tasks, focus]
status: in-progress
---

# 🚀 Active Projects Dashboard

Track ongoing engineering and writing tasks.

> [!WARNING]
> Keep active projects to a maximum of 3 at any time to avoid context switching fatigue.

## 🎯 Current Sprints

### 1. Minimal & Modern Obsidian App
- [x] Design minimal UI with dark/light theme support
- [x] Implement live bi-directional Wikilink parser
- [x] Build interactive 2D physics Graph View
- [x] Implement live preview Markdown editor with callouts
- [ ] Connect with [[Modern Architecture]]

### 2. Personal Knowledge Base Refactor
- [x] Import legacy notes
- [ ] Standardize metadata with [[Second Brain]] guidelines
- [ ] Review connections in [[Daily Notes]]

---

## Notes & Scratchpad
Check [[Welcome to Obsidian]] for keyboard shortcuts and workflow tips.
`
  },
  {
    id: 'modern-architecture',
    name: 'Modern Architecture.md',
    path: 'Technical/Modern Architecture.md',
    folder: 'Technical',
    updatedAt: Date.now() - 5000000,
    createdAt: Date.now() - 86400000 * 5,
    content: `---
title: Modern Architecture
tags: [tech, architecture, local-first]
type: technical-spec
---

# Modern Local-First Architecture

Software like Obsidian thrives on a **Local-First** philosophy: users own their data on their own file system, and apps operate at the speed of local hardware.

\`\`\`typescript
interface KnowledgeGraph {
  nodes: Map<string, NoteNode>;
  edges: Set<LinkEdge>;
  reindex(): void;
  resolveBacklinks(target: string): NoteNode[];
}
\`\`\`

## 🛠️ The Core Pillars

1. **Local Files as Source of Truth**: Files are standard Markdown (.md). No vendor lock-in.
2. **In-Memory Graph Index**: Wikilinks (\`[[...]]\`) are indexed reactively for instantaneous backlink lookups.
3. **Canvas-Based Graph Visualization**: Ultra-fast physics rendering using HTML5 Canvas and force simulation.
4. **Resilient Offline Operation**: Zero network dependency for core reading and writing.

> [!TIP]
> Read more about how atomic ideas interact in [[Zettelkasten Method]] and organize your work in [[Active Projects]].
`
  },
  {
    id: 'markdown-cheat-sheet',
    name: 'Markdown Cheat Sheet.md',
    path: 'Guides/Markdown Cheat Sheet.md',
    folder: 'Guides',
    updatedAt: Date.now() - 10000000,
    createdAt: Date.now() - 86400000 * 6,
    content: `---
title: Markdown Cheat Sheet
tags: [guide, markdown, syntax]
---

# Markdown & Obsidian Syntax Guide

Everything you need to know about formatting in Obsidian!

---

## 📌 Headers
# Heading 1
## Heading 2
### Heading 3

---

## 🎨 Text Formatting
- **Bold text**: \`**bold**\`
- *Italic text*: \`*italic*\`
- ~~Strikethrough~~: \`~~strikethrough~~\`
- \`Inline code\`: \`\`code\`\`
- [External Web Link](https://obsidian.md)

---

## 🗂️ Obsidian Wikilinks
- Simple link: \`[[Welcome to Obsidian]]\` -> [[Welcome to Obsidian]]
- Link to [[Zettelkasten Method]]

---

## 🗃️ Callouts / Admonitions

> [!NOTE]
> This is a standard note callout. Useful for secondary information.

> [!TIP]
> This is a tip! You can use tips to highlight best practices.

> [!WARNING]
> Be careful when editing raw files outside your vault.

> [!IMPORTANT]
> This is an important callout for critical notices.

---

## 📐 Math Equations (LaTeX)
Inline math: $E = mc^2$ or $\\sqrt{a^2 + b^2} = c$

Block equation:
$$f(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi$$

---

## 📊 Tables

| Feature | Obsidian | Traditional Note Apps |
| :--- | :--- | :--- |
| **Storage** | Plain Local .md Files | Proprietary Cloud DB |
| **Links** | Bi-directional [[Wikilinks]] | Unidirectional or None |
| **Graph** | Visual Knowledge Graph | None |
| **Offline** | 100% Native Offline | Sync required |
`
  },
  {
    id: 'daily-notes',
    name: 'Daily Notes.md',
    path: 'Guides/Daily Notes.md',
    folder: 'Guides',
    updatedAt: Date.now() - 12000000,
    createdAt: Date.now() - 86400000 * 7,
    content: `---
title: Daily Notes Guide
tags: [daily, journal, habits]
---

# 📅 Daily Notes Philosophy

Daily notes serve as an inbox for your mind. Rather than figuring out where a thought belongs immediately, write it in today's daily note!

## 💡 Recommended Daily Template
- **🎯 Top 3 Priorities**: What must get done today?
- **📝 Stream of Consciousness**: Quick notes from conversations and readings.
- **🔗 Connections**: Link to relevant projects like [[Active Projects]] and conceptual frameworks like [[Second Brain]].

Check out [[Daily/2026-10-11]] for today's active journal entry!
`
  },
  {
    id: 'daily-today',
    name: '2026-10-11.md',
    path: 'Daily/2026-10-11.md',
    folder: 'Daily',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    content: `---
title: 2026-10-11 Daily Note
tags: [daily, log]
date: 2026-10-11
---

# 📅 Daily Note — October 11, 2026

## 🎯 Priorities for Today
- [x] Launch the new modern Obsidian app
- [x] Test bi-directional link navigation to [[Welcome to Obsidian]]
- [ ] Connect project tasks with [[Active Projects]]
- [ ] Review [[Zettelkasten Method]] principles

## 💭 Notes & Thoughts
Building software with a **Local-First** mindset feels astonishingly fast. Having instant reactive search and interactive graph views transforms static notes into an alive second brain.

## 🔗 Connected Notes
- [[Welcome to Obsidian]]
- [[Active Projects]]
- [[Modern Architecture]]
`
  }
];
