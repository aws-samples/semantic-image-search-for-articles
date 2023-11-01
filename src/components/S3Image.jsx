import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Storage } from "aws-amplify";

const S3Image = ({ s3Uri }) => {
  const [url, setUrl] = useState(s3Uri);

  const fetchImages = async () => {
    const s3Key = s3Uri.split("/").slice(3).join("/")
    try {
      const response = await Storage.get(s3Key, { customPrefix: { public: "" }, expires: 60 });
      setUrl(response);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchImages();
  });

  return (
    <img src={url} style={{ width: "100%" }} alt={s3Uri.split("/").slice(-1)} />
  );
}

S3Image.propTypes = {
  s3Uri: PropTypes.string.isRequired,
};

export default S3Image;
