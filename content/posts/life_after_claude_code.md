---
title: "Life After Claude Code"
pubDate: "2026-04-21"
description: "Reflections on coding practices after adopting Claude Code and agent-assisted development."
tag: ["Claude Code"]
---

# Life After Claude Code

## Review of My Coding Practices After Adopting Claude Code

Claude Code is a command-line coding agent that rose to prominence in 2025. When I interviewed for my current position, the tool was still immature. I joined TikTok in July of the preceding year. At that time, I did not regard coding agents as particularly capable; I viewed them chiefly as aids for implementing straightforward utility functions. The notion of so-called “vibe coding” struck me as little more than a narrative popularized by financial media. Since then, however, I have relied increasingly on agent-assisted development. Models have advanced from Claude 3 to Claude 4.7, and nearly all of the code I ship is now produced with substantial AI assistance.

The following is a rough estimate of AI contribution to my output:

* July 2025: approximately 20% (chiefly basic utilities);
* September 2025: approximately 40% (utilities and simpler features, with prompts that had to be highly specific);
* November–December 2025: approximately 50% (with the introduction of **skills**, I authored numerous skills to support more complex work);
* January 2026: approximately 70% (skills in heavy use, markedly stronger models, and agents handling most implementation end to end);
* April 2026: approximately 100% (a mature skill stack; I specify requirements in relatively loose terms, perform review and commentary, and open merge requests).

These figures illustrate how quickly AI-generated code has come to dominate my workflow. The implication is clear: writing code by hand is no longer my principal occupation.

The disruption caused by AI is widespread, and the pace of change is eroding roles that once seemed secure. Consider the YouTuber *CodeWithAntonio*, who produced lengthy, high-quality tutorials (ten hours or more) guiding viewers through full-stack projects such as real-time document systems and chat-based web applications. Such tutorials are now far less obviously necessary. He has addressed the shift publicly.

<YouTube id="7LeW1XLjeds" title="AI killed the coding tutorial" />

## What Will Constitute Software Engineers’ Core Competencies?

I state the conclusion at the outset: manual coding will soon cease to be the defining skill of the profession.

It is useful to walk through the software development life cycle (SDLC) to identify where engineers still add distinctive value.

The life cycle may be summarized as: (1) planning, (2) requirements analysis, (3) design, (4) implementation, (5) testing, (6) deployment, and (7) maintenance.

Consider each stage in sequence (bearing in mind that the process is cyclical):

1. **Planning** is typically led by product managers or clients; engineers have limited involvement. Product managers and clients can already use AI to produce prototypes that validate feasibility quickly. A prototype, however, is not a production system. Engineers remain responsible for robust implementation. AI can nevertheless benefit engineers by encouraging more realistic plans and reducing misalignment between engineering and product or client stakeholders.

2. **Requirements analysis** allows engineers to use AI to digest specifications rapidly and to accelerate technology choices. AI can also assist with richer prototypes. Here a traditional strength of engineering—**system design**—remains central. Architectural decisions for backend and frontend systems, traffic and capacity planning for data centers, degradation and fallback strategies, and related design work still depend on human judgment informed by experience.

3. **Design**: For conventional user interfaces that do not demand a highly distinctive visual language, much of the routine work can already be delegated to automated tooling.

4. **Implementation**: AI can now carry the bulk of coding. The engineer’s role shifts toward reviewing generated changes, validating behavior (including unit tests, which may themselves be AI-assisted), and opening merge requests with a concise sign-off.

5. **Testing**: Manual testing, especially end-to-end testing on large systems, remains difficult to automate fully. Challenges include exceptional cases that confound even capable models, intricate and hard-to-replicate environments, synthetic or sensitive test data, and nuanced interpretation of results.

6. **Deployment**: Portions of deployment workflows can be automated with AI assistance, though complex production environments still evolve gradually. Monitoring and incident response continue to require human oversight.

7. **Maintenance**: A substantial share of maintenance work is already susceptible to automation.

Across these phases, engineers must coordinate with peers, product managers, clients, and technical leads to keep delivery on track. Strong communication and collaboration are therefore indispensable. Engineers also produce documentation, presentations, and meeting notes; clarity in written communication is likewise a core competency.

In summary, the competencies I expect to matter most are:

* System design;
* Debugging, particularly end-to-end and production debugging;
* Communication and collaboration;
* Documentation;
* Project management;
* Problem solving;
* Continuous learning, including mastery of new tools and domains;
* Authoring and curating agent skills and comparable workflow assets;
* Other emergent practices as the landscape shifts.

Large language models may acquire many of these capabilities in the near term. What remains for practitioners is uncertain. Pragmatic steps include deepening familiarity with AI-assisted workflows, cultivating creativity in problem framing, and maintaining resilience in the face of rapid structural change. The industry is in flux, and no one is insulated from this technological transition.
