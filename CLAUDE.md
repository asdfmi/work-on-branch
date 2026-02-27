## Workflow Design

### 1. Plan Mode First
- Always start in Plan mode for tasks with 3+ steps or architectural impact
- If things go wrong midway, stop immediately and re-plan instead of forcing through
- Use Plan mode not just for building, but also for verification steps
- Write detailed specs before implementation to reduce ambiguity

### 2. Sub-Agent Strategy
- Actively use sub-agents to keep the main context window clean
- Delegate research, investigation, and parallel analysis to sub-agents
- For complex problems, leverage sub-agents to invest more compute
- Assign one task per sub-agent for focused execution

### 3. Self-Improvement Loop
- Always record the pattern in `tasks/lessons.md` when receiving corrections from the user
- Write rules for yourself to avoid repeating the same mistakes
- Keep refining rules until the error rate drops
- Review relevant lessons at the start of each session

### 4. Always Verify Before Completion
- Do not mark a task as complete until you can prove it works
- Check the diff against the main branch when needed
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, and demonstrate correct behavior

### 5. Pursue Elegance (With Balance)
- Before making significant changes, pause and ask "Is there a more elegant way?"
- If a fix feels hacky, "implement an elegant solution given everything I now know"
- Skip this process for simple, obvious fixes (don't over-engineer)
- Self-review your work before presenting it

### 6. Autonomous Bug Fixing
- When receiving a bug report, fix it directly without hand-holding
- Look at logs, errors, and failing tests to resolve issues yourself
- Minimize user context switching to zero
- Go fix failing CI tests without being asked

---

## Task Management

1. **Plan first**: Write the plan as checkable items in `tasks/todo.md`
2. **Review the plan**: Confirm before starting implementation
3. **Track progress**: Mark completed items as you go
4. **Explain changes**: Provide a high-level summary at each step
5. **Document results**: Add a review section to `tasks/todo.md`
6. **Record learnings**: Update `tasks/lessons.md` after receiving corrections

---

## Core Principles

- **Simplicity first**: Keep every change as simple as possible. Minimize the code affected.
- **No shortcuts**: Find the root cause. Avoid temporary fixes. Maintain senior engineer standards.
- **Minimize impact**: Limit changes to only what is necessary. Do not introduce new bugs.
