# Codex Project Rules

## Code Comments

- Every time Codex writes or modifies code in this project, the changed code must include comments.
- Comments should explain why the code exists, why a specific design is chosen, or what pitfall it avoids.
- Avoid comments that only repeat the code literally, unless the user explicitly asks for beginner-style explanations.
- Prefer concise Chinese comments so the code remains easy to read while still being helpful for learning.

## 代码注释要求

- 生成的代码**必须加注释**（继承自全局 CLAUDE.md）
- 注释解释 **WHY**，不解释 WHAT（命名应该已经说清楚做什么）
- 非显而易见的设计决策、踩过的坑、特殊约束才值得写注释

## README 代码案例原则

- 往 README 写代码示例时，**优先从项目中找已有代码**直接引用，保持示例和项目代码一致
- 只有项目中确实没有对应代码时，才自己编写示例
- 这样避免 README 的示例代码和实际项目代码脱节，读 README 的人看到的就是项目里真跑着的代码