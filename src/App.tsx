import React from "react";
import "./App.css";
import { Button, Center, Input, Text } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";

function App() {
  // const [data, setData] = React.useState();
  const [query, setQuery] = React.useState<string>("");
  let data = [];

  const _handlerQuery = (event: any) => {
    setQuery(event.target.value);
  };
  const _handlerSearch = () => {};
  return (
    <div className="body">
      <Text fontSize="2xl" className="title" color={"black"}>
        Search Github User
      </Text>
      <Center className="searchbar">
        <Input
          variant="flushed"
          focusBorderColor="blue.400"
          placeholder="Search Username"
          value={query}
          onChange={_handlerQuery}
          className="query"
        />
        <Button
          leftIcon={<SearchIcon />}
          onClick={() => _handlerSearch()}
          colorScheme="linkedin"
          width={"100%"}
        >
          Search
        </Button>
      </Center>
      {data.length > 0 ? (
        <div>
          <Text
            className="textResult"
            fontSize={"md"}
          >{`Showing users for "${query}"`}</Text>
        </div>
      ) : (
        <Text
          className="textResult"
          fontSize={"md"}
        >{`Users "${query}" not found`}</Text>
      )}
    </div>
  );
}

export default App;
