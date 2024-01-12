import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';

export default function DialogEmbeddingOptions(props) {
    const [show, setShow] = React.useState(false);
    const [pineconeKey, setPineconeKey] = React.useState("");
    const [pineconeEnvironment, setPineconeEnvironment] = React.useState("");
    const [pineconeIndex, setPineconeIndex] = React.useState("");
    const [pineconeChunkSize, setPineconeChunkSize] = React.useState(1000);

    props.setShow = setShow;
    props.setPineconeKey = setPineconeKey;
    props.setPineconeEnvironment = setPineconeEnvironment;
    props.setPineconeIndex = setPineconeIndex;
    props.setPineconeChunkSize = setPineconeChunkSize;

    const handleClose = () => setShow(false);

    const saveData = () => {
        ;
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Embedding Options</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <table class="embedding_options_table">
                    <tr>
                        <td>Index Name </td>
                        <td>
                            <FormControl as="input" defaultValue={pineconeIndex}
                                onChange={(e) => setPineconeIndex(e.target.value)}></FormControl>
                        </td>
                        <td>
                            <Button variant="secondary" onClick={() => props.deleteIndex()}>
                                <i class="material-icons">delete</i>
                            </Button>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colspan="4">Must be lower case only and can include "-"</td>
                    </tr>
                    <tr>
                        <td>API Key </td>
                        <td>
                            <FormControl as="input" defaultValue={pineconeKey}
                                onChange={(e) => setPineconeKey(e.target.value)}></FormControl>
                        </td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Environment </td>
                        <td>
                            <FormControl as="input" defaultValue={pineconeEnvironment}
                                onChange={(e) => setPineconeEnvironment(e.target.value)}></FormControl>
                        </td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Chunk Size</td>
                        <td>
                            <FormControl as="input" defaultValue={pineconeChunkSize}
                                onChange={(e) => setPineconeChunkSize(Number(e.target.value))}></FormControl>
                        </td>
                        <td>tokens</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colspan="3" style={{ textAlign: "right", padding: "8px" }}>
                            <Button variant="primary" onClick={
                                () => props.savePineconeOptions(pineconeIndex, pineconeKey, pineconeEnvironment, pineconeChunkSize)
                            }>Save Options</Button>
                        </td>
                        <td></td>
                    </tr>
                </table>
            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}