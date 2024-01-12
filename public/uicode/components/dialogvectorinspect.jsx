import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';

export default function DialogVectorInspect(props) {
    const [show, setShow] = React.useState(false);
    const [id, setId] = React.useState("");
    const [fetchResults, setFetchResults] = React.useState("");

    props.setShow = setShow;

    const handleClose = () => setShow(false);

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Test Pinecone</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <table class="embedding_options_table">
                    <tr>
                        <td>Vector Id </td>
                        <td>
                            <FormControl as="input" onChange={(e) => setId(e.target.value)}></FormControl>
                        </td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colspan="3" style={{ textAlign: "right", padding: "8px" }}>
                            <button class="btn btn-primary" onClick={async () => {
                                let results = await props.fetchVector(id);
                                setFetchResults(results);
                            }}>Fetch Vector</button>
                            <button class="btn btn-primary" onClick={async () => {
                                let results = await props.deleteVector(id);
                                setFetchResults(results);
                            }}>Delete Vector</button>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colspan="4">
                            <div style={{whiteSpace: "pre-wrap"}}>{fetchResults}</div>
                            <hr />
                        </td>
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