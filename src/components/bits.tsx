import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Icon,
  useClipboard,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon, LinkIcon, MinusIcon, QuestionOutlineIcon } from "@chakra-ui/icons";
import { ApiError } from "../api";
import { plural } from "../lib/format";
import { STATUS_LABEL, type RepoStatus } from "../lib/score";
import { STATUS_COLOR } from "../theme";

export function StatusBadge({ status, size = "md" }: { status: RepoStatus; size?: "md" | "lg" }) {
  return (
    <Badge
      colorScheme={STATUS_COLOR[status]}
      variant="solid"
      fontSize={size === "lg" ? "md" : "xs"}
      px={size === "lg" ? 3 : 2}
      py={size === "lg" ? 1 : 0.5}
      borderRadius="full"
      textTransform="none"
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** ✓ full, ~ partial, ✗ zero, ? no data. */
export function FactorMark({ value }: { value: number | null }) {
  if (value === null) return <Icon as={QuestionOutlineIcon} color="gray.400" aria-label="No data" />;
  if (value === 1) return <Icon as={CheckIcon} color="green.500" aria-label="Pass" />;
  if (value === 0) return <Icon as={CloseIcon} boxSize={2.5} color="red.500" aria-label="Fail" />;
  return <Icon as={MinusIcon} color="orange.400" aria-label="Partial" />;
}

export function Sparkline({ values, height = 32 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  const barWidth = 8;
  const gap = 3;
  const width = values.length * (barWidth + gap) - gap;
  return (
    <Box
      as="svg"
      width={`${width}px`}
      height={`${height}px`}
      viewBox={`0 0 ${width} ${height}`}
      color="blue.500"
      role="img"
      aria-label={`Commits per week: ${values.join(", ")}`}
    >
      {values.map((v, i) => {
        const h = v === 0 ? 1.5 : Math.max(3, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={1.5}
            fill="currentColor"
            opacity={v === 0 ? 0.3 : 1}
          >
            <title>{`${plural(values.length - i, "week")} ago: ${plural(v, "commit")}`}</title>
          </rect>
        );
      })}
    </Box>
  );
}

const ERROR_TITLE: Record<ApiError["code"], string> = {
  INVALID_INPUT: "Unrecognized input",
  NOT_FOUND: "Repo not found",
  NPM_NOT_FOUND: "npm package not found",
  NPM_NO_REPO: "No GitHub repo found",
  RATE_LIMITED: "GitHub rate limit reached",
  UPSTREAM: "Couldn't fetch data",
  NETWORK: "Can't connect",
};

export function ErrorState({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : "UPSTREAM";
  const resetAt = error instanceof ApiError && error.resetAt ? new Date(error.resetAt) : null;
  const notFound = code === "NOT_FOUND" || code === "NPM_NOT_FOUND" || code === "NPM_NO_REPO";
  return (
    <Alert status={notFound ? "warning" : "error"} borderRadius="md" alignItems="flex-start">
      <AlertIcon />
      <Box>
        <AlertTitle>{ERROR_TITLE[code]}</AlertTitle>
        <AlertDescription display="block">
          {error.message}
          {resetAt &&
            `. Try again around ${resetAt.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}.`}
        </AlertDescription>
      </Box>
    </Alert>
  );
}

export function ShareButton() {
  const { onCopy, hasCopied } = useClipboard(window.location.href);
  return (
    <Button size="sm" variant="outline" leftIcon={<LinkIcon />} onClick={onCopy}>
      {hasCopied ? "Link copied" : "Copy link"}
    </Button>
  );
}
