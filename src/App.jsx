import { useState } from "react";
import PropTypes from "prop-types";
import { Amplify, API, Storage } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import Textarea from "@cloudscape-design/components/textarea";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import FileUpload from "@cloudscape-design/components/file-upload";
import Alert from "@cloudscape-design/components/alert";
import S3Image from './components/S3Image';
import React from 'react';
import { Popover, StatusIndicator } from '@cloudscape-design/components';

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

const App = ({ signOut }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [article, setArticle] = useState("");
  const [results, setResults] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);

  const submitQuery = async () => {
    try {
      setIsSubmitting(true);
      setResults([]);
      const response = await API.post("api", "/", { body: article, headers: { "Content-Type": "text/plain" } });
      setResults(response.results);
      setIsSubmitting(false);
    } catch (error) {
      setIsSubmitting(false);
      console.log(error);
    }
  }

  const uploadFile = async () => {
    try {
      setIsUploading(true);
      await Storage.put(`uploads/${files[0].name}`, files[0], { customPrefix: { public: "" }, contentType: files[0].type });
      setFiles([]);
      setIsUploading(false);
      setShowNotification(true);
    } catch (error) {
      console.log(error);
    }
  }

  const selectFile = ({ detail }) => {
    if (detail.value.length > 0) {
      if (detail.value[0].size > 10000000) {
        setFileErrors(["Files must be less than 10MB."]);
      } else {
        setFileErrors([]);
      }
      setFiles(detail.value);
    } else {
      setFiles([]);
      setFileErrors([]);
    }
  }

  return (
    <AppLayout
      contentType="dashboard"
      navigationHide={true}
      toolsHide={true}
      notifications={
        showNotification &&
        <Alert
          dismissible
          type="success"
          onDismiss={() => setShowNotification(false)}
        >
          You successfully uploaded a file.
        </Alert>
      }
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header
                variant="h1"
                description="Search for images that are semantically similar to your article"
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <FileUpload
                      onChange={selectFile}
                      value={files}
                      fileErrors={fileErrors}
                      i18nStrings={{
                        uploadButtonText: e =>
                          e ? "Choose files" : "Choose file",
                        dropzoneText: e =>
                          e ? "Drop files to upload" : "Drop file to upload",
                        removeFileAriaLabel: e =>
                          `Remove file ${e + 1}`,
                        errorIconAriaLabel: "Error"
                      }}
                      accept=".jpg,.jpeg,.png"
                    />
                    <Button
                      variant="primary"
                      onClick={uploadFile}
                      loading={isUploading}
                      disabled={files.length == 0 || fileErrors.length > 0}
                    >
                      Upload
                    </Button>
                    <Button
                      onClick={signOut}
                    >
                      Sign out
                    </Button>
                  </SpaceBetween>
                }
              >
                Semantic image search for articles using Amazon ML Services
              </Header>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
          <Container
            header={
              <Header
                variant="h2"
                description="Example mini articles that work with our small image repositry"
              >
                Example mini articles
              </Header>
            }
          >
            <ul>
              <li>
              <span className="custom-wrapping">
                <Box margin={{ right: 'xxs' }} display="inline-block">
                  <Popover
                    size="small"
                    position="top"
                    triggerType="custom"
                    dismissButton={false}
                    content={<StatusIndicator type="success">Test article copied</StatusIndicator>}
                  >
                    <Button
                    variant="inline-icon"
                      iconName="copy"
                      ariaLabel="Copy test article"
                      onClick={() => {
                        navigator.clipboard.writeText('I love playing sport on the beach in teams with my friends. We stick up a tall high net, and before long we are all diving to the ground to hit the ball back to the other team.');
                      }}
                    />
                  </Popover>
                </Box>
                I love playing sport on the beach in teams with my friends. We stick up a tall high net, and before long we are all diving to the ground to hit the ball back to the other team.
              </span>
              </li>
              <li>
              <span className="custom-wrapping">
                <Box margin={{ right: 'xxs' }} display="inline-block">
                  <Popover
                    size="small"
                    position="top"
                    triggerType="custom"
                    dismissButton={false}
                    content={<StatusIndicator type="success">Test article copied</StatusIndicator>}
                  >
                    <Button
                    variant="inline-icon"
                      iconName="copy"
                      ariaLabel="Copy test article"
                      onClick={() => {
                        navigator.clipboard.writeText('Every year, I have been going to Glastonbury to see my favourite bands. We always have a ball and cannot wait to go again the next year.');
                      }}
                    />
                  </Popover>
                </Box>
                Every year, I have been going to Glastonbury to see my favourite bands. We always have a ball and cannot wait to go again the next year.
              </span>
              </li>
              <li>
              <span className="custom-wrapping">
                <Box margin={{ right: 'xxs' }} display="inline-block">
                  <Popover
                    size="small"
                    position="top"
                    triggerType="custom"
                    dismissButton={false}
                    content={<StatusIndicator type="success">Test article copied</StatusIndicator>}
                  >
                    <Button
                    variant="inline-icon"
                      iconName="copy"
                      ariaLabel="Copy test article"
                      onClick={() => {
                        navigator.clipboard.writeText('Werner Vogels loved travelling around the globe in his SUV. We see his SUV come up in many scenes as he drives to go and meet various customers in their home towns.');
                      }}
                    />
                  </Popover>
                </Box>
                Werner Vogels loved travelling around the globe in his Toyota. We see his Toyota come up in many scenes as he drives to go and meet various customers in their home towns.
              </span>
              </li>                            
              <li>
              <span className="custom-wrapping">
                <Box margin={{ right: 'xxs' }} display="inline-block">
                  <Popover
                    size="small"
                    position="top"
                    triggerType="custom"
                    dismissButton={false}
                    content={<StatusIndicator type="success">Test article copied</StatusIndicator>}
                  >
                    <Button
                    variant="inline-icon"
                      iconName="copy"
                      ariaLabel="Copy test article"
                      onClick={() => {
                        navigator.clipboard.writeText('When I was growing up, I lived in a small fishing town near the Amalfi coast. We would wake up super early every day to catch fish to sell in the village.');
                      }}
                    />
                  </Popover>
                </Box>
                When I was growing up, I lived in a small fishing town near the Amalfi coast. We would wake up super early every day to catch fish to sell in the village.
              </span>
              </li>              
            </ul>
          
                  
          </Container>             
          </SpaceBetween>
          <SpaceBetween size="s">
            <Textarea
              onChange={({ detail }) => setArticle(detail.value)}
              value={article}
              placeholder="Paste or type your article content here."
              rows={4}
            />
            <Button
              variant="primary"
              onClick={submitQuery}
              loading={isSubmitting}
            >
              Search
            </Button>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {results.map((result, index) => (
                <div style={{ width: '31.33%', marginLeft: '1%', marginRight: '1%', marginBottom: 20 }}>
                  <Container
                    key={index}
                    footer={result.image_words}
                  >
                    <Box
                      textAlign="center"
                    >
                      <img src={`${awsExports.cloudfront_url}/${result.image_path.split("/").slice(3).join("/")}`} style={{ width: "100%" }} alt={result.image_path} />
                    </Box>
                  </Container>
                </div>
                ))}
              </div>
            </SpaceBetween>
          </ContentLayout>
        }
      />
    );
  }

App.propTypes = {
  signOut: PropTypes.func.isRequired,
};

const AuthApp = withAuthenticator(App, { hideSignUp: true })

export default AuthApp;
