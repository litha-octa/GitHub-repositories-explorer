import { useState } from "react";
import { Box, Button, Center, Input, Spinner, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import axios from "axios";
import "./App.css";

function App() {
  const [users, setUsers] = useState<any>();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsloading] = useState<boolean>(false);
  const [isError, setIsError] = useState<any>({
    show: false,
    message: "",
  });
  const urlSearchUser = (keyword: string) =>
    `https://api.github.com/search/users?q=${keyword}`;

  const _handlerQuery = (event: any) => {
    setQuery(event.target.value);
  };

  const HandlerError = () => {
    return (
      <Box
        style={!isError?.show ? { display: "none" } : { display: "contents" }}
      >
        <Text>{isError?.message}</Text>
      </Box>
    );
  };
  const UserItem = () => {
    const [isCollaps, setIsCollaps] = useState(true);
    const [repos, setRepos] = useState<any>();
    const _handlerGetRepo = async (x: any) => {
      let data = await fetch(x || "");
      let json = await data.json();
      setRepos(json);
      console.log(json);
    };
    return (
      <>
        {users?.map((item: any, index: number) => {
          return (
            <Box width={"100%"} key={index}>
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
              <Box
                style={
                  isCollaps ? { display: "none" } : { display: "contents" }
                }
              >
                {isLoading ? <Spinner /> : null}
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
        })}
      </>
    );
  };
  const _handlerSearch = async () => {
    setUsers([]);
    setIsError({
      ...isError,
      show: !isError.show,
      message: ``,
    });
    if (query?.length > 0) {
      axios
        .get(urlSearchUser(query))
        .then((res) => {
          setIsloading(true);
          console.log(res.data);
          if (res?.data?.total_count > 0) {
            setIsError({
              ...isError,
              show: true,
              message: `Showing users for "${query}"`,
            });
            setUsers(res?.data?.items?.slice(0, 5));
          } else {
            setIsError({
              ...isError,
              show: true,
              message: `Username "${query}" not found`,
            });
          }

          setTimeout(() => {
            setIsloading(false);
          }, 3000);
        })
        .catch((err) => {
          setIsError({
            ...isError,
            show: true,
            message: err.message,
          });
        });
    } else {
      setIsError({
        ...isError,
        show: true,
        message: "Input username",
      });
    }
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
        <HandlerError />
        <UserItem />
      </Center>
    </Box>
  );
}

export default App;
