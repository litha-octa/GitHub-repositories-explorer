import { Box, Button, Container, Heading, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { CompareView } from "./components/CompareView";
import { RepoInput } from "./components/RepoInput";
import { ReportView } from "./components/ReportView";
import { useUrlRepos } from "./useUrlRepos";

const EXAMPLES = ["zustand", "reduxjs/redux", "@tanstack/react-query", "request/request"];

export default function App() {
  const [repos, setRepos] = useUrlRepos();
  const single = repos.length === 1 ? repos[0] : null;

  return (
    <Container maxW="5xl" px={4} py={{ base: 6, md: 10 }}>
      <Stack spacing={8}>
        <Box as="header">
          <Heading
            as="h1"
            size="lg"
            cursor="pointer"
            onClick={() => setRepos([])}
            w="fit-content"
          >
            RepoCheckup
          </Heading>
          <Text color="gray.500" mt={1}>
            Is this library still maintained and safe to use? Find out in 5 seconds.
          </Text>
        </Box>

        <Box>
          <RepoInput
            key={single ?? repos.join(",")}
            label="Repo or package"
            buttonLabel="Check"
            size="lg"
            defaultValue={single ?? ""}
            onSubmit={(value) => setRepos([value])}
            autoFocus={repos.length === 0}
          />
          {repos.length === 0 && (
            <Wrap mt={3} spacing={2} align="center">
              <WrapItem>
                <Text fontSize="sm" color="gray.500">
                  Try:
                </Text>
              </WrapItem>
              {EXAMPLES.map((example) => (
                <WrapItem key={example}>
                  <Button size="xs" variant="outline" onClick={() => setRepos([example])}>
                    {example}
                  </Button>
                </WrapItem>
              ))}
              <WrapItem>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  onClick={() => setRepos(["zustand", "reduxjs/redux", "jotai"])}
                >
                  Compare zustand vs redux vs jotai
                </Button>
              </WrapItem>
            </Wrap>
          )}
        </Box>

        {single && (
          <ReportView key={single} input={single} onCompare={(other) => setRepos([single, other])} />
        )}
        {repos.length > 1 && <CompareView repos={repos} onChange={setRepos} />}
      </Stack>
    </Container>
  );
}
