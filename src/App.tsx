import React, { useEffect, useState } from "react";
import { Box, Button, Center, Input, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import "./App.css";

function App() {
  const [users, setUsers] = useState<any>();

  const [query, setQuery] = useState<string>("");
  const [urlRepo, setUrlRepo] = useState<string>();

  const _handlerQuery = (event: any) => {
    setQuery(event.target.value);
  };

  const _handlerSearch = async () => {
    let data = await fetch(`https://api.github.com/search/users?q=${query}`);
    let json = await data.json();
    setUsers(json.items.slice(0, 5));
  };

  const UserItem = ({ item }: any) => {
    const [isCollaps, setIsCollaps] = useState(true);
    const [repos, setRepos] = useState<any>();
    const _handlerGetRepo = async (x: any) => {
      let data = await fetch(x || "");
      let json = await data.json();
      setRepos(json);
      console.log(json);
    };
    return (
      <Box width={"100%"}>
        <Box
          className="userList"
          onClick={() => {
            setIsCollaps(!isCollaps);
            _handlerGetRepo(item.repos_url);
          }}
        >
          <Text fontSize={"25px"}>{item?.login || "username"}</Text>
          {isCollaps ? (
            <ChevronDownIcon boxSize={30} />
          ) : (
            <ChevronUpIcon boxSize={30} />
          )}
        </Box>
        <Box style={isCollaps ? { display: "none" } : { display: "contents" }}>
          {repos ? (
            repos?.map((_item: any, index: number) => {
              return (
                <Box key={index} className="repoList">
                  <Text className="repoTitle">{_item.name}</Text>
                  <Text>{_item.description || "No description"}</Text>
                </Box>
              );
            })
          ) : (
            <Text>no repos</Text>
          )}
        </Box>
      </Box>
    );
  };
  return (
    <Box className="body">
      <Center className="searchbar">
        <Input
          placeholder="Enter username"
          value={query}
          onChange={_handlerQuery}
          className="query"
        />
        <Button onClick={() => _handlerSearch()} className="btn-submit">
          Search
        </Button>

        {users ? (
          users?.map((item: any, index: number) => {
            return <UserItem item={item} key={index} />;
          })
        ) : (
          <Text>null</Text>
        )}
      </Center>
    </Box>
  );
}

export default App;
