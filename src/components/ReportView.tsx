import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Code,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Skeleton,
  Stack,
  Tag,
  Text,
} from "@chakra-ui/react";
import { AddIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { reportQuery } from "../api";
import { scoreRepo, summarize, type HealthReport } from "../lib/score";
import type { RepoMetrics } from "../lib/types";
import { ErrorState, FactorMark, ShareButton, StatusBadge } from "./bits";
import { METRICS } from "./metrics";
import { RepoInput } from "./RepoInput";

interface Props {
  input: string;
  onCompare: (other: string) => void;
}

export function ReportView({ input, onCompare }: Props) {
  const { data, error, isPending } = useQuery(reportQuery(input));
  const [comparing, setComparing] = useState(false);

  if (isPending) return <ReportSkeleton />;
  if (error) return <ErrorState error={error} />;

  const now = new Date();
  const health = scoreRepo(data, now);

  return (
    <Stack spacing={6}>
      <RepoHeader metrics={data} />
      <HealthSummary health={health} />

      <Box>
        <Heading as="h3" size="sm" mb={3}>
          Metric breakdown
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          {METRICS.map((metric) => (
            <Box key={metric.key} borderWidth="1px" borderRadius="md" p={3}>
              <Text fontSize="sm" color="gray.500">
                {metric.label}
              </Text>
              <Box fontWeight="semibold" mt={1}>
                {metric.render(data, now)}
              </Box>
              <Code fontSize="xs" mt={2} bg="transparent" color="gray.500" p={0} whiteSpace="normal">
                {metric.source}
              </Code>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      {comparing ? (
        <Box>
          <Text fontWeight="semibold" mb={2}>
            Compare {data.fullName} with…
          </Text>
          <RepoInput label="Library to compare" buttonLabel="Add" onSubmit={onCompare} autoFocus />
        </Box>
      ) : (
        <Flex gap={3} wrap="wrap" justify="space-between" align="center">
          <Text fontSize="sm" color="gray.500">
            Data fetched {new Date(data.fetchedAt).toLocaleString("en-US")}
          </Text>
          <HStack>
            <ShareButton />
            <Button size="sm" colorScheme="blue" leftIcon={<AddIcon />} onClick={() => setComparing(true)}>
              Compare
            </Button>
          </HStack>
        </Flex>
      )}
    </Stack>
  );
}

function RepoHeader({ metrics }: { metrics: RepoMetrics }) {
  return (
    <HStack spacing={4} align="start">
      <Avatar src={metrics.ownerAvatarUrl} name={metrics.fullName} size="md" />
      <Box minW={0}>
        <Heading as="h2" size="lg" wordBreak="break-word">
          <Link href={metrics.htmlUrl} isExternal>
            {metrics.fullName} <ExternalLinkIcon boxSize={4} />
          </Link>
        </Heading>
        {metrics.npmPackage && (
          <Tag size="sm" mt={1}>
            npm: {metrics.npmPackage}
          </Tag>
        )}
        {metrics.description && (
          <Text mt={1} color="gray.600" _dark={{ color: "gray.300" }}>
            {metrics.description}
          </Text>
        )}
      </Box>
    </HStack>
  );
}

function HealthSummary({ health }: { health: HealthReport }) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={5}>
      <Flex gap={4} align="center" wrap="wrap">
        <StatusBadge status={health.status} size="lg" />
        {health.score !== null && (
          <Text fontSize="3xl" fontWeight="bold" lineHeight={1}>
            {health.score}
            <Text as="span" fontSize="md" color="gray.500" fontWeight="normal">
              {" "}
              / 100
            </Text>
          </Text>
        )}
      </Flex>
      <Text mt={3} fontSize="sm" color="gray.500" data-testid="summary">
        {summarize(health)}
      </Text>
      {health.factors.length > 0 && (
        <Stack mt={4} spacing={2} as="ul" listStyleType="none">
          {health.factors.map((factor) => (
            <HStack as="li" key={factor.key} spacing={3} align="center">
              <Flex w={5} justify="center">
                <FactorMark value={factor.value} />
              </Flex>
              <Text flex={1}>{factor.reason}</Text>
              <Text fontSize="sm" color="gray.500" flexShrink={0}>
                {factor.value === null
                  ? "not scored"
                  : `${Math.round(factor.weight * factor.value)}/${factor.weight}`}
              </Text>
            </HStack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function ReportSkeleton() {
  return (
    <Stack spacing={4} aria-busy="true" aria-label="Loading report">
      <Skeleton height="48px" />
      <Skeleton height="140px" />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height="80px" />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
