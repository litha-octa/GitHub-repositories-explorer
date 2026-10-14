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

/** ✓ penuh, ~ sebagian, ✗ nol, ? data tidak tersedia. */
export function FactorMark({ value }: { value: number | null }) {
  if (value === null) return <Icon as={QuestionOutlineIcon} color="gray.400" aria-label="Tidak ada data" />;
  if (value === 1) return <Icon as={CheckIcon} color="green.500" aria-label="Lolos" />;
  if (value === 0) return <Icon as={CloseIcon} boxSize={2.5} color="red.500" aria-label="Tidak lolos" />;
  return <Icon as={MinusIcon} color="orange.400" aria-label="Sebagian" />;
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
      aria-label={`Commit per minggu: ${values.join(", ")}`}
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
            <title>{`${values.length - i} minggu lalu: ${v} commit`}</title>
          </rect>
        );
      })}
    </Box>
  );
}

const ERROR_TITLE: Record<ApiError["code"], string> = {
  INVALID_INPUT: "Input tidak dikenali",
  NOT_FOUND: "Repo tidak ditemukan",
  NPM_NOT_FOUND: "Package npm tidak ditemukan",
  NPM_NO_REPO: "Repo GitHub tidak diketahui",
  RATE_LIMITED: "Batas request GitHub tercapai",
  UPSTREAM: "Gagal mengambil data",
  NETWORK: "Tidak bisa terhubung",
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
            `. Coba lagi sekitar pukul ${resetAt.toLocaleTimeString("id-ID", {
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
      {hasCopied ? "Link disalin" : "Salin link"}
    </Button>
  );
}
