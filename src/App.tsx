import { useState } from "react";
import { Box, Button, Center, Input, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import axios from "axios";
import "./App.css";
import { ClipLoader } from "react-spinners";
import { token } from "./PersonalAccessToken";

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

  const UserItem = ({ item }: any) => {
    const [isCollaps, setIsCollaps] = useState(true);
    const [repos, setRepos] = useState<any>();
    const [loadingRepo, setLoadingRepo] = useState<boolean>(false);
    console.log(loadingRepo);
    const _handlerGetRepo = async (url: any) => {
      setLoadingRepo(true);
      if (url) {
        axios
          .get(url)
          .then((res) => {
            setLoadingRepo(false);
            if (res?.data?.length > 0) {
              setRepos(res?.data);
            } else {
              return <Text>This user doesn't have repository</Text>;
            }
          })
          .catch((err) => {
            console.log(err);
            setLoadingRepo(false);
          });
      } else {
      }
    };
    return (
      <>
        <Box width={"100%"}>
          <Box
            className="userList"
            onClick={() => {
              setIsCollaps(!isCollaps);
              _handlerGetRepo(item?.repos_url);
            }}
          >
            <Text fontSize={"25px"}>{item?.login || "Username"}</Text>
            {isCollaps ? (
              <ChevronDownIcon boxSize={30} />
            ) : (
              <ChevronUpIcon boxSize={30} />
            )}
          </Box>
          <Box
            style={isCollaps ? { display: "none" } : { display: "contents" }}
          >
            <ClipLoader
              color={"black"}
              loading={loadingRepo}
              size={70}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
            {
              // repos ? (
              repos?.map((_item: any, index: number) => {
                return (
                  <Box className="repoList" key={index}>
                    <Text className="repoTitle">
                      {_item.name || "Repo Name"}
                    </Text>
                    <Text>{_item.description || "No description"}</Text>
                  </Box>
                );
              })
              // ) : (
              //   <Text>no repos</Text>
              // )
            }
          </Box>
        </Box>
      </>
    );
  };
  const _handlerSearch = async () => {
    setIsloading(!isLoading);
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
          setIsloading(false);
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
        })
        .catch((err) => {
          setIsError({
            ...isError,
            show: true,
            message: err.message,
          });
        });
    } else {
      setIsloading(false);
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
        <Button
          isLoading={isLoading}
          onClick={() => _handlerSearch()}
          className="btn-submit"
        >
          Search
        </Button>
        <HandlerError />
        {users
          ? users?.map((item: any, index: number) => {
              return <UserItem item={item} key={index} />;
            })
          : null}
      </Center>
    </Box>
  );
}

export default App;
