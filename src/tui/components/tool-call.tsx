import React, { memo, useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { ToolUIPart, DynamicToolUIPart } from "ai";
import { getToolName } from "ai";
import type { TUIAgentUITools } from "../types";

type ToolPart = ToolUIPart<TUIAgentUITools> | DynamicToolUIPart;

type ToolCallProps = {
  part: ToolPart;
};

function formatToolDisplay(toolName: string, input: unknown): { name: string; summary: string } {
  const inputObj = (input ?? {}) as Record<string, unknown>;

  switch (toolName) {
    case "read":
      return {
        name: "Read",
        summary: `${inputObj.filePath || inputObj.file_path || inputObj.path || ""}`,
      };
    case "write":
      return {
        name: "Write",
        summary: `${inputObj.filePath || inputObj.file_path || inputObj.path || ""}`,
      };
    case "edit":
      return {
        name: "Update",
        summary: `${inputObj.filePath || inputObj.file_path || inputObj.path || ""}`,
      };
    case "glob":
      return {
        name: "Search",
        summary: `pattern: "${inputObj.pattern || ""}"`,
      };
    case "grep":
      return {
        name: "Search",
        summary: `"${inputObj.pattern || ""}"`,
      };
    case "bash":
      const cmd = String(inputObj.command || "").slice(0, 50);
      return {
        name: "Bash",
        summary: cmd + (String(inputObj.command || "").length > 50 ? "..." : ""),
      };
    case "todo_write":
      return {
        name: "TodoWrite",
        summary: "Updating task list",
      };
    case "task":
      return {
        name: "Task",
        summary: `${inputObj.description || "Spawning subagent"}`,
      };
    case "memory_save":
      return {
        name: "MemorySave",
        summary: "Saving to memory",
      };
    case "memory_recall":
      return {
        name: "MemoryRecall",
        summary: `"${inputObj.query || ""}"`,
      };
    default:
      return {
        name: toolName.charAt(0).toUpperCase() + toolName.slice(1),
        summary: JSON.stringify(input).slice(0, 40),
      };
  }
}

function formatOutput(toolName: string, output: unknown): string {
  if (output === undefined || output === null) return "";

  const outputObj = output as Record<string, unknown>;

  switch (toolName) {
    case "read":
      if (outputObj.totalLines) {
        return `Read ${outputObj.totalLines} lines`;
      }
      if (outputObj.endLine && outputObj.startLine) {
        return `Read ${Number(outputObj.endLine) - Number(outputObj.startLine) + 1} lines`;
      }
      return "File read";
    case "glob":
      if (Array.isArray(outputObj.files)) {
        return `Listed ${outputObj.files.length} paths`;
      }
      return "Files listed";
    case "grep":
      if (Array.isArray(outputObj.matches)) {
        return `Found ${outputObj.matches.length} matches`;
      }
      return "Search complete";
    case "write":
      return "File written";
    case "edit":
      if (outputObj.additions !== undefined || outputObj.removals !== undefined) {
        return `Updated with ${outputObj.additions || 0} addition${outputObj.additions !== 1 ? "s" : ""} and ${outputObj.removals || 0} removal${outputObj.removals !== 1 ? "s" : ""}`;
      }
      return "File updated";
    case "bash":
      if (outputObj.exitCode !== undefined) {
        return outputObj.exitCode === 0 ? "Command succeeded" : `Exit code ${outputObj.exitCode}`;
      }
      return "Command executed";
    default:
      const str = JSON.stringify(output);
      return str.length > 60 ? str.slice(0, 57) + "..." : str;
  }
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL = 80;

// Custom spinner with internal animation state
function ToolSpinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return <Text color="yellow">{SPINNER_FRAMES[frame]} </Text>;
}

// Memoized completed output display
const ToolOutput = memo(function ToolOutput({
  toolName,
  output
}: {
  toolName: string;
  output: unknown;
}) {
  return (
    <Box paddingLeft={2}>
      <Text color="gray">└ </Text>
      <Text color="white">{String(formatOutput(toolName, output))}</Text>
      <Text color="gray"> (ctrl+o to expand)</Text>
    </Box>
  );
});

// Memoized error display
const ToolError = memo(function ToolError({ errorText }: { errorText: string }) {
  return (
    <Box paddingLeft={2}>
      <Text color="gray">└ </Text>
      <Text color="red">Error: {errorText.slice(0, 80)}</Text>
    </Box>
  );
});

// Not memoized to allow spinner animation to work
export function ToolCall({ part }: ToolCallProps) {
  const toolName = getToolName(part);
  const { name, summary } = formatToolDisplay(toolName, part.input);

  const isRunning = part.state === "input-available" || part.state === "input-streaming";
  const isSuccess = part.state === "output-available";
  const isError = part.state === "output-error";

  const dotColor = isRunning ? "yellow" : isSuccess ? "green" : "red";

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      {/* Main tool line */}
      <Box>
        {isRunning ? (
          <ToolSpinner />
        ) : (
          <Text color={dotColor}>● </Text>
        )}
        <Text bold color={isRunning ? "yellow" : "white"}>{name}</Text>
        <Text color="gray">(</Text>
        <Text color="cyan">{summary}</Text>
        <Text color="gray">)</Text>
      </Box>

      {/* Output line (if completed) */}
      {isSuccess && part.output !== undefined && (
        <ToolOutput toolName={toolName} output={part.output} />
      )}

      {/* Error line (if error) */}
      {isError && "errorText" in part && part.errorText !== undefined && (
        <ToolError errorText={part.errorText} />
      )}
    </Box>
  );
}
