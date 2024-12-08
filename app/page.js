"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  Spinner,
  Divider,
  Link,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
} from "@nextui-org/react";
import * as XLSX from "xlsx";

export default function Home() {
  const [data, setData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [patternDesc, setPatternDesc] = useState([]);

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
        console.log("Excel Data:", jsonData); // Debugging log

        setData(jsonData);
        // Create unique patterns for Autocomplete
        const patterns = Array.from(
          new Map(
            jsonData.map((row, index) => [
              row.Tool?.toLowerCase() || `unknown-${index}`, // Use a unique key based on Tool
              {
                key: `${index}`, // Generate unique key
                label: row.Tool || "Unknown Tool", // Use Tool as label
                description: row.Tool || "Unknown Tool", // Use Tool directly
              },
            ])
          ).values()
        );
        

        console.log("Patterns:", patterns); // Debugging log
        setPatternDesc(patterns);

        const prompts = [
          { column: "Environment", question: "Select your environment:", image: "/images/environment.png" },
          { column: "Platform", question: "Select your platform:", image: "/images/platform.png" },
          { column: "Requirement", question: "Select your requirement:", image: "/images/requirement.png" },
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
      setFilteredData([]); // Clear filtered data
      return;
    }

    const results = patternDesc.filter((pattern) =>
      pattern.label.toLowerCase().includes(value.toLowerCase())
    );


    setFilteredData(results); // Debounced update
  };

  const selectSearchResult = (selected) => {
    const result = patternDesc.find((item) => item.key === selected);
    if (result) {
      // Update state in an effect to decouple from render
      setTimeout(() => {
        setSearch(result.label); // Update search input
        setFilteredData([result]); // Show the selected result
      }, 0);
    }
  };

  const getOptionImage = (option) => {
    if (!option) return "/images/default.png";
  
    // Normalize the option to lowercase and replace spaces or special characters
    const normalizedOption = option.toLowerCase().replace(/[^a-z0-9]/g, "-");
    //const normalizedOption = option.toLowerCase();
  
    // Construct the image path dynamically
    return `/images/${normalizedOption}.png`;
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
      setSearch(""); // Reset search on step change
    }
  };

  const restart = () => {
    setStep(0);
    setSelections({});
    setFilteredData(data);
    setSearch(""); // Reset search 
  };

  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "5px", marginTop: "0px" }}>
        <Spinner size="lg" />
        <p>Loading questions...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "5px", marginTop: "0px" }}>
      {/* Search Bar */}
      <div className="flex w-full flex-wrap md:flex-nowrap gap-4">
      <Autocomplete
          className="max-w-xs"
          label="Search Patterns"
          placeholder="Search by platform..."
          value={search}
          onSearchChange={handleSearch}
        >
          {patternDesc.map((pattern) => (
            <AutocompleteItem key={pattern.key}>{pattern.label}</AutocompleteItem>
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
      {/* Progress Bar */}
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
          {/* Question selection UI */}
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
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{questions[step].question}</h2>
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
                    src={getOptionImage(option)}
                    alt={option}
                    //style={{
                      //width: "100%",
                      //height: "150px",
                      //objectFit: "cover",
                      //borderRadius: "10px 10px 0 0",
                    //}}
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
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {filteredData.length === 1
              ? "I found the following pattern for you:"
              : "I found the following patterns for you:"}
          </p>

          <div
            className={
              filteredData.length === 1
                ? "gap-4 grid grid-cols-1 grid-rows-1 px-8 justify-items-center items-center content-start"
                : "gap-4 grid grid-cols-2 grid-rows-1 px-8 justify-items-center items-center content-start"
            }
            //style={{ height: filteredData.length === 1 ? "calc(100vh - 200px)" : "auto" }}
          >
            {filteredData.map((row, index) => (
              <Card
                key={index}
                className={filteredData.length === 1 ? "col-span-1 sm:col-span-1 h-[600px]" : "col-span-1 sm:col-span-1 h-[600px]"}
                style={{
                  width: filteredData.length === 1 ? "400px" : "auto",
                }}
              >
                <CardHeader className="flex gap-3" style={{ justifyContent: "left" }}>
                  <Image
                    alt="logo"
                    height={40}
                    radius="sm"
                    src={getLogoImage(row["Tool"])}
                    width={40}
                  />
                  <div className="flex flex-col" style={{ textAlign: "left" }}>
                    <p className="text-md">Deployment: {row["Deployment"]}</p>
                    <p
                      className="text-small text-default-500"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {row["Tool"]}
                    </p>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    {row["Description"]?.split("\n").map((line, idx) => {
                      const trimmedLine = line.trim();

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
                              color: "#0070f3",
                              display: "block", // Ensure link takes full line space
                              marginBottom: "10px",
                            }}
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
            ))}
          </div>
        </>
  
      )}
    </div>
  );
}
