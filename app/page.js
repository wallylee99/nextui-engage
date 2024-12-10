"use client";

import { useState, useEffect} from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  Divider,
  Link,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
  Progress,
  Modal, 
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
  Input, 
  Text,
} from "@nextui-org/react";
import * as XLSX from "xlsx";
import Cookies from "js-cookie"; // Use js-cookie for easier cookie handling

export default function Home() {
  const [data, setData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [patternDesc, setPatternDesc] = useState([]);
  const [filteredByAutocomplete, setFilteredByAutocomplete] = useState([]);
  const [patternFrequency, setPatternFrequency] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [ticketCreatedMessage, setTicketCreatedMessage] = useState("");

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTicketCreatedMessage(""); // Clear the message when the modal is closed
  };
  
  // Load patterns from cookies on component mount
  useEffect(() => {
    const storedPatternFrequency = Cookies.get("patternFrequency");
    if (storedPatternFrequency) {
      setPatternFrequency(JSON.parse(storedPatternFrequency));
    }
  }, []);

  useEffect(() => {
    async function loadExcel() {
      try {
        const response = await fetch("/index.xlsx");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const dataBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(dataBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        //console.log("Excel Data:", jsonData); // Debugging log

        setData(jsonData);
        // Create unique patterns for Autocomplete
        const patterns = Array.from(
          new Map(
            jsonData.map((row, index) => [
              row.Tool?.toLowerCase() || `unknown-${index}`, // Use a unique key based on Tool
              {
                key: `${index}`, // Generate unique key
                label: row.Tool || "Unknown Tool", // Use Tool as label
                //description: row.Tool || "Unknown Tool", // Use Tool directly
              },
            ])
          ).values()
        );
        

        //console.log("Patterns:", patterns); // Debugging log
        setPatternDesc(patterns);

        const prompts = [
          { column: "Environment", question: "Select your environment:"},
          { column: "Platform", question: "Select your platform:"},
          { column: "Requirement", question: "Select your requirement:"},
        ];

        setQuestions(prompts);
        setFilteredData(jsonData);
      } catch (error) {
        console.error("Error loading Excel file:", error);
      }
    }

    loadExcel();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);

    if (value.trim() === "") {
      setFilteredByAutocomplete([]); // Clear autocomplete filtered data
      return;
    }

    const results = data.filter((row) =>
      row.Tool?.toLowerCase().includes(value.toLowerCase())
    );
    //console.log("Search Input:", value); // Log search input
    //console.log("Filtered Results by Autocomplete:", results); // Log filtered results
  

    setFilteredByAutocomplete(results);
  };

  const selectSearchResult = (selected) => {
    const result = patternDesc.find((item) => item.key === selected);
    if (result) {
      setSearch(result.label); // Update search input
      const results = data.filter((row) =>
        row.Tool?.toLowerCase() === result.label.toLowerCase()
      );
      //console.log("Autocomplete Selected:", result); // Log selected item
      //console.log("Filtered Results from Autocomplete Selection:", results); // Log filtered results
  
      updatePatternFrequency(result.label);
      setFilteredByAutocomplete(results);
    }
  };

  const updatePatternFrequency = (pattern) => {
    setPatternFrequency((prevFrequency) => {
      const updatedFrequency = {
        ...prevFrequency,
        [pattern]: (prevFrequency[pattern] || 0) + 1,
      };
      Cookies.set("patternFrequency", JSON.stringify(updatedFrequency), { expires: 7 }); // Persist to cookies for 7 days
      return updatedFrequency;
    });
  };
  
  const getLogoImage = (tool) => {
    if (!tool) return "/images/azure.png";

    const lowerTool = tool.toLowerCase();

    if (lowerTool.includes("dynatrace")) return "/images/dynatrace.png";
    if (lowerTool.includes("scom")) return "/images/scom.png";
    if (lowerTool.includes("cloudwatch")) return "/images/cloudwatch.png";

    return "/images/azure.png";
  };

  const handleAnswer = (column, answer) => {
    const updatedSelections = { ...selections, [column]: answer };
    setSelections(updatedSelections);

    const nextFilteredData = data.filter((row) =>
      Object.keys(updatedSelections).every(
        (key) => row[key]?.toLowerCase() === updatedSelections[key]?.toLowerCase()
      )
    );

    setFilteredData(nextFilteredData);

    if (step < questions.length) {
      setStep(step + 1);
    }
    if (step === questions.length - 1) { //update most popular pattern
      //{console.log("handleAnswer:", nextFilteredData)}
      if (nextFilteredData.length > 0) {
        const requirementValue = nextFilteredData[0].Requirement;
        if (requirementValue) {
          updatePatternFrequency(requirementValue);
        }
      }
    }
  };

  const handleSubmit = () => {
    // Logic to handle ticket creation (if needed)
    setTicketCreatedMessage("Ticket is created!"); // Set the success message
    handleCloseModal(); // Close the modal
  };

  const restart = () => {
    setStep(0);
    setSelections({});
    setFilteredData(data);
    setSearch(""); // Reset search 
    setFilteredByAutocomplete([]); // Clear autocomplete filtering    
  };

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  const renderCard = (row, index) => (
    <Card
      key={index}
      className="h-[600px]" // Removes explicit column span for grid control
      style={{
        width: "100%", // Card takes full width of its grid column
      }}
    >
      <CardHeader className="flex gap-3" style={{ justifyContent: "left" }}>
        <Image
          alt="logo"
          height={40}
          radius="sm"
          src={getLogoImage(row.Tool)}
          width={40}
        />
        <div className="flex flex-col" style={{ textAlign: "left" }}>
          <p className="text-md">Deployment: {row.Deployment}</p>
          <p className="text-small text-default-500" style={{ fontSize: "0.75rem" }}>
            {row.Tool}
          </p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          {row["Description"]?.split("\n").map((line, idx) => {
            const trimmedLine = line.trim();
  
            // Check if description is a jira ticket creation
            if (trimmedLine.includes("|jira")) {
              return (
                <div key={idx} style={{ marginBottom: "10px" }}>
                <Button color="primary" onPress={handleOpenModal}>
                  Create a ticket
                </Button>
                <Modal isOpen={isModalOpen} placement="top-center" onOpenChange={handleCloseModal}>
                  <ModalContent>
                    {(onClose) => (
                      <>
                        <ModalHeader className="flex flex-col gap-1">Create a ticket</ModalHeader>
                        <ModalBody>
                          <Input
                            isRequired
                            label="AppCat ID"
                            placeholder="Enter the AppCat ID"
                            variant="bordered"
                          />
                          <Input
                            isRequired
                            label="CIO"
                            placeholder="Enter the CIO"
                            variant="bordered"
                          />
                          <Input
                            isRequired
                            label="PR Code"
                            placeholder="Enter the PR Code"
                            variant="bordered"
                          />
                          <Input
                            label="LTO"
                            placeholder="Enter the LTO"
                            variant="bordered"
                          />          
                          <Input
                            label="Start"
                            placeholder="Enter the Start Date"
                            variant="bordered"
                          />    
                          <Input
                            label="End"
                            placeholder="Enter the End Date"
                            variant="bordered"
                          />                                                                                                  
                        </ModalBody>
                        <ModalFooter>
                          <Button color="danger" variant="flat" onPress={onClose}>
                             Cancel
                          </Button>
                          <Button color="primary" onPress={handleSubmit}>
                            Create
                          </Button>
                        </ModalFooter>
                      </>
                    )}
                  </ModalContent>
                </Modal>
                {/* Display success message */}
                {ticketCreatedMessage && (
                  <Text style={{ marginTop: "10px", color: "green" }}>{ticketCreatedMessage}</Text>
                )}
                </div>
              );
            }
            // Check if the line contains a |, treat it as a link
            if (trimmedLine.includes("|")) {
              const [description, url] = trimmedLine.split("|").map((part) => part.trim());
              return (
                <Link
                  key={idx}
                  isExternal
                  showAnchorIcon
                  href={url}
                  style={{
                    fontSize: "0.75rem",
                    wordBreak: "break-word",
                    cursor: "pointer",
                  }}
                  color="primary"
                >
                  {description}
                </Link>
              );
            }

            // Check if the line starts with a bullet point (·)
            if (trimmedLine.startsWith("·")) {
              return (
                <ul
                  key={idx}
                  style={{
                    textAlign: "left",
                    paddingLeft: "20px",
                    fontSize: "0.75rem",
                    marginBottom: "5px",
                  }}
                >
                  <li>{trimmedLine.slice(1).trim()}</li>
                </ul>
              );
            }
  
            // Render normal paragraphs for other lines
            return (
              <p
                key={idx}
                style={{
                  textAlign: "left",
                  fontSize: "0.75rem",
                  marginBottom: "10px",
                }}
              >
                {trimmedLine}
              </p>
            );
          })}
        </div>
  
        <div>
          <p
            className="text-small text-default-500"
            style={{
              fontSize: "0.75rem",
              marginTop: "10px",
            }}
          >
            Environment
          </p>
  
          <div className="flex gap-4">
            <Checkbox size="sm" defaultSelected color="success">
              <span style={{ fontSize: "0.7rem" }}>non-prod</span>
            </Checkbox>
            <Checkbox size="sm" defaultSelected color="primary">
              <span style={{ fontSize: "0.7rem" }}>prod</span>
            </Checkbox>
          </div>
        </div>
      </CardBody>
  
      <Divider />
      <CardFooter style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <p
          className="text-small"
          style={{ fontSize: "0.75rem", marginBottom: "10px" }}
        >
          Reference
        </p>
        {row["Link"]
          ?.split("\n")
          .filter((linkEntry) => linkEntry.trim() !== "")
          .map((linkEntry, idx) => {
            const [description, url] = linkEntry.split("|").map((item) =>
              item.trim()
            );
            return (
              <div key={idx} className="flex gap-2">
                <Link
                  isExternal
                  showAnchorIcon
                  href={url}
                  style={{
                    fontSize: "0.75rem",
                    wordBreak: "break-word",
                    cursor: "pointer",
                  }}
                  color="primary"
                >
                  {description}
                </Link>
              </div>
            );
          })}
      </CardFooter>
    </Card>
  );
  

  const renderPopularPatterns = () => {
    const sortedPatterns = Object.entries(patternFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20); // Display top 3 patterns
    const totalCount = sortedPatterns.reduce((sum, [, count]) => sum + count, 0) || 1; // Total frequency for scaling

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column", // Single column layout
          gap: "1px", // Space between items
          width: "50%", // Takes 1/3 of the browser width
          margin: "0 auto", // Center horizontally
          textAlign: "left", // Center align text
        }}
      >
        <p style={{ fontWeight: "bold", fontSize: "1rem", textAlign: "center" }}>Frequently Searched Patterns</p>
        <div style={{ height: "10px" }}></div>
        {sortedPatterns.map(([pattern, count], index) => (
          <div key={index}>
            {/* Progress bar */}
            <Progress
              className="max-w-md"
              //value={count}
              value={(count / totalCount) * 100} // Scale to total 100%
              showValueLabel={true}
              //max={maxCount}
              max={100}
              label={pattern}
              size="sm"
            />
          </div>
        ))}
      </div>
    );
  };
  
  
  
    
  return (
    <div style={{ textAlign: "center", padding: "5px", marginTop: "0px" }}>
      {/* Search Bar */}
      <div className="flex w-full justify-end flex-wrap md:flex-nowrap gap-4">
      <Autocomplete
          className="max-w-xs"
          label="Search Patterns"
          placeholder="Search by platform..."
          value={search}
          onInputChange={handleSearch}
          onSelectionChange={selectSearchResult}
        >
          {patternDesc.map((pattern) => (
            <AutocompleteItem key={pattern.key} value={pattern.key}>
              {pattern.label}
            </AutocompleteItem>
          ))}
        </Autocomplete>
      </div>       
      <div style={{ textAlign: "left", marginTop: "0px", marginBottom: "10px" }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            restart();
          }}
          style={{
            textDecoration: "none",
            color: "#0070f3",
            fontWeight: "bold",
          }}
        >
          Start Over
        </a>
      </div>
      {/* Progress Bar begins */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <div
          style={{
            width: "50%", // Set width to 50% of the page
            margin: "0 auto", // Center the progress bar horizontally
            height: "5px", // Progress bar height
            background: "#e0e0e0",
            borderRadius: "5px",
            overflow: "hidden",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              height: "5px",
              width: `${((step + 1) / questions.length) * 100}%`,
              background: "#0070f3",
            }}
          ></div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            width: "50%", // Set width to 50% of the page
            margin: "0 auto", // Center the progress bar questions horizontally
          }}
        >
          {questions.map((q, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                fontSize: "0.9rem",
                fontWeight: step >= index ? "bold" : "normal",
                color: step >= index ? "#0070f3" : "#999",
                textAlign: "center",
              }}
            >
              {selections[q.column] || q.question}
            </div>
          ))}
        </div>
      </div>
      {/* Progress Bar ends */}

      {/* Cards rendered from filteredByAutocomplete */}
      {filteredByAutocomplete.length > 0 ? (
        <>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            I found the following patterns for you:
          </p>
          <div className="gap-4 grid grid-cols-2 grid-rows-1 px-8 justify-items-center items-center content-start">
            {filteredByAutocomplete.map(renderCard)}
          </div>
        </>
      ) : (
        <>
        {/* Original rendering based on questions */}
        {step < questions.length ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "10vh",
            }}
          >
            <Card
              style={{
                maxWidth: "500px",
                margin: "10px",
                textAlign: "center",
                background: "transparent",
                boxShadow: "none",
              }}
            >
              <CardHeader>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                  {questions[step].question}
                </h2>
              </CardHeader>
            </Card>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                justifyContent: "center",
              }}
            >
              {[
                ...new Set(filteredData.map((row) => row[questions[step].column])),
              ].map((option, index) => (
                <Card
                  key={index}
                  isPressable
                  role="button"
                  aria-label={`Select ${option}`}
                  onClick={() => handleAnswer(questions[step].column, option)}
                  style={{
                    width: "200px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                >
                  <CardBody style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Image
                      src={getLogoImage(option)}
                      alt={option}
                    />
                  </CardBody>
                  <CardFooter style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <p style={{ margin: "10px 0", fontSize: "1rem", fontWeight: "bold", textAlign: "center" }}>
                      {option}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
          ) : (
            <>
              {/* Cards rendered from question prompts */}
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                I found the following patterns for you:
              </p>
              <div className="gap-4 grid grid-cols-2 grid-rows-1 px-8 justify-items-center items-center content-start">
                {filteredData.map(renderCard)}
              </div>
            </>
        )}
        </>
      )}
      <div style={{ marginTop: "40px" }}>
        {renderPopularPatterns()}
      </div>
    </div> 
    
  )
}