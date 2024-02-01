import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';
import Form from 'react-bootstrap/Form';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

export default function DialogEmbeddingOptions(props) {
    const [show, setShow] = React.useState(false);
    const [serverType, setServerType] = React.useState("Serverless");
    const [pineconeKey, setPineconeKey] = React.useState("");
    const [pineconeEnvironment, setPineconeEnvironment] = React.useState("");
    const [pineconeIndex, setPineconeIndex] = React.useState("");
    const [pineconeChunkSize, setPineconeChunkSize] = React.useState(1000);
    const [includeTextInMeta, setIncludeTextInMeta] = React.useState(false);
    const [chunkingType, setChunkingType] = React.useState("size");
    const [sentenceWindow, setSentenceWindow] = React.useState(1);

    props.hooks.setShow = setShow;
    props.hooks.setPineconeKey = setPineconeKey;
    props.hooks.setPineconeEnvironment = setPineconeEnvironment;
    props.hooks.setPineconeIndex = setPineconeIndex;
    props.hooks.setPineconeChunkSize = setPineconeChunkSize;
    props.hooks.setIncludeTextInMeta = setIncludeTextInMeta;
    props.hooks.setChunkingType = setChunkingType;
    props.hooks.setSentenceWindow = setSentenceWindow;
    props.hooks.setServerType = setServerType;

    const handleClose = () => setShow(false);
    const handleSave = () => {
        props.hooks.savePineconeOptions(serverType, pineconeIndex, pineconeKey, pineconeEnvironment,
            pineconeChunkSize, includeTextInMeta, chunkingType, sentenceWindow);
        setShow(false);
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Embedding Project Options</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <Tabs
                    defaultActiveKey="server"
                    className="mb-3"
                >
                    <Tab eventKey="server" title="Server">
                        <table className="embedding_options_table">
                            <tbody>
                                <tr>
                                    <td>Server Type</td>
                                    <td colSpan="2">
                                        <Form.Select 
                                        aria-label="Server Type Select"
                                        defaultValue={serverType || 'Serverless'}
                                        onChange={(e) => setServerType(e.target.value)}
                                        >
                                            <option>Serverless</option>
                                            <option>Server</option>
                                        </Form.Select>
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Index Name </td>
                                    <td>
                                        <FormControl as="input" defaultValue={pineconeIndex}
                                            onChange={(e) => setPineconeIndex(e.target.value)}></FormControl>
                                    </td>
                                    <td>
                                        <Button variant="secondary" onClick={() => props.hooks.deleteIndex()}>
                                            <i className="material-icons">delete</i>
                                        </Button>
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan="4">Must be lower case only and can include "-"</td>
                                </tr>
                                <tr>
                                    <td>API Key </td>
                                    <td>
                                        <FormControl as="input" defaultValue={pineconeKey}
                                            onChange={(e) => setPineconeKey(e.target.value)}>
                                        </FormControl>
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Environment </td>
                                    <td>
                                        <FormControl as="input" defaultValue={pineconeEnvironment}
                                            onChange={
                                                (e) => setPineconeEnvironment(e.target.value)
                                            }>
                                        </FormControl>
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </Tab>
                    <Tab eventKey="chunking" title="Chunking">
                        <table className="embedding_options_table">
                            <tbody>
                                <tr>
                                    <td>Chunking Type</td>
                                    <td colSpan="2">
                                        <Form.Select defaultValue={chunkingType}
                                            onChange={(e) => setChunkingType(e.target.value)}>
                                            <option value="none">None</option>
                                            <option value="size">By Size (tokens)</option>
                                            <option value="sentence">By Sentence</option>
                                        </Form.Select>
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Chunk Size</td>
                                    <td>
                                        <FormControl as="input" defaultValue={pineconeChunkSize}
                                            onChange={
                                                (e) => setPineconeChunkSize(Number(e.target.value))
                                            }>
                                        </FormControl>
                                    </td>
                                    <td>tokens</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Sentence Window</td>
                                    <td>
                                        <FormControl as="input" defaultValue={sentenceWindow}
                                            onChange={
                                                (e) => setSentenceWindow(Number(e.target.value))
                                            }>
                                        </FormControl>
                                    </td>
                                    <td>sentences</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td colSpan="3">
                                        <Form.Check
                                            inline
                                            label="Include Text in Metadata (small projects only)"
                                            type="switch"
                                            checked={includeTextInMeta}
                                            onChange={
                                                (e) => setIncludeTextInMeta(e.target.checked)
                                            }
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Tab>
                </Tabs>

            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="primary" onClick={handleSave}>
                    Save
                </Button>
                &nbsp;
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}