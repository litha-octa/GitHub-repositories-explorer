import type { ReactNode } from "react";
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { SmallCloseIcon } from "@chakra-ui/icons";
import { useQueries } from "@tanstack/react-query";
import { ApiError, reportQuery } from "../api";
import { scoreRepo, type HealthReport } from "../lib/score";
import type { RepoMetrics } from "../lib/types";
import { MAX_REPOS } from "../useUrlRepos";
import { FactorMark, ShareButton, StatusBadge } from "./bits";
import { METRICS } from "./metrics";
import { RepoInput } from "./RepoInput";

interface Props {
  repos: string[];
  onChange: (repos: string[]) => void;
}

type Column =
  | { input: string; state: "loading" }
  | { input: string; state: "error"; error: Error }
  | { input: string; state: "ready"; metrics: RepoMetrics; health: HealthReport };

export function CompareView({ repos, onChange }: Props) {
  const now = new Date();
  const results = useQueries({ queries: repos.map((input) => reportQuery(input)) });
  const columns: Column[] = results.map((result, i) => {
    const input = repos[i];
    if (result.data) {
      return { input, state: "ready", metrics: result.data, health: scoreRepo(result.data, now) };
    }
    if (result.error) return { input, state: "error", error: result.error };
    return { input, state: "loading" };
  });

  const cell = (column: Column, render: (c: Extract<Column, { state: "ready" }>) => ReactNode) =>
    column.state === "ready" ? render(column) : column.state === "loading" ? <Skeleton h="20px" /> : null;

  const rows: Array<{ label: string; render: (c: Extract<Column, { state: "ready" }>) => ReactNode }> = [
    { label: "Status", render: (c) => <StatusBadge status={c.health.status} /> },
    {
      label: "Score",
      render: (c) => (
        <Text fontSize="2xl" fontWeight="bold">
          {c.health.score ?? "–"}
        </Text>
      ),
    },
    {
      label: "Score breakdown",
      render: (c) =>
        c.health.factors.length === 0 ? (
          <Text color="gray.500">Repo is archived</Text>
        ) : (
          <Stack spacing={1}>
            {c.health.factors.map((f) => (
              <Flex key={f.key} gap={2} align="center">
                <FactorMark value={f.value} />
                <Text fontSize="sm">{f.reason}</Text>
              </Flex>
            ))}
          </Stack>
        ),
    },
    ...METRICS.map((metric) => ({
      label: metric.label,
      render: (c: Extract<Column, { state: "ready" }>) => metric.render(c.metrics, now),
    })),
  ];

  return (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading as="h2" size="md">
          Comparing {repos.length} libraries
        </Heading>
        <ShareButton />
      </Flex>

      <TableContainer borderWidth="1px" borderRadius="lg" whiteSpace="normal">
        <Table size="sm" variant="simple" sx={{ tableLayout: "fixed", minW: `${180 + repos.length * 220}px` }}>
          <Thead>
            <Tr>
              <Th w="180px" />
              {columns.map((column) => (
                <Th key={column.input} textTransform="none" letterSpacing="normal" verticalAlign="top" py={3}>
                  <Flex justify="space-between" align="start" gap={2}>
                    <Box minW={0}>
                      {column.state === "ready" ? (
                        <Link href={column.metrics.htmlUrl} isExternal fontSize="md" wordBreak="break-word">
                          {column.metrics.fullName}
                        </Link>
                      ) : (
                        <Text fontSize="md" wordBreak="break-word">
                          {column.input}
                        </Text>
                      )}
                      {column.state === "ready" && column.metrics.npmPackage && (
                        <Text fontWeight="normal" color="gray.500">
                          npm: {column.metrics.npmPackage}
                        </Text>
                      )}
                    </Box>
                    <IconButton
                      aria-label={`Remove ${column.input}`}
                      icon={<SmallCloseIcon />}
                      size="xs"
                      variant="ghost"
                      onClick={() => onChange(repos.filter((r) => r !== column.input))}
                    />
                  </Flex>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {columns.some((c) => c.state === "error") && (
              <Tr>
                <Td fontWeight="semibold">Error</Td>
                {columns.map((column) => (
                  <Td key={column.input} color="red.500">
                    {column.state === "error" &&
                      (column.error instanceof ApiError ? column.error.message : "Failed to load")}
                  </Td>
                ))}
              </Tr>
            )}
            {rows.map((row) => (
              <Tr key={row.label}>
                <Td fontWeight="semibold" color="gray.600" _dark={{ color: "gray.300" }} verticalAlign="top">
                  {row.label}
                </Td>
                {columns.map((column) => (
                  <Td key={column.input} verticalAlign="top">
                    {cell(column, row.render)}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {repos.length < MAX_REPOS && (
        <Box>
          <Text fontWeight="semibold" mb={2}>
            Add another library (up to {MAX_REPOS})
          </Text>
          <RepoInput
            key={repos.join(",")}
            label="Library to compare"
            buttonLabel="Add"
            onSubmit={(value) => onChange([...repos, value])}
          />
        </Box>
      )}
    </Stack>
  );
}
