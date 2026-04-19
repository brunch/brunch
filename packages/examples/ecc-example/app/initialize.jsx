const ed25519 = require('noble-ed25519');
const secp256k1 = require('noble-secp256k1');
const bls12 = require('noble-bls12-381');
const React = require('preact');

function arrayToHex(array) {
  return Array.from(array)
    .map(c => c.toString(16).padStart(2, "0"))
    .join("");
}

function timer(label) {
  console.time(label);
  return (value) => {
    console.timeEnd(label);
    return value;
  }
}

class ECCCalculator extends React.Component {
  constructor() {
    super();
    this.state = {
      privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      secp: {
        hex: '034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff',
        x: '31786781763520711516504796705501580263047480643491642414438614973346706264063',
        y: '115098966614433306530954635991961836831388920962654509778142658150360531838297'
      },
      ed: {
        hex: '207a067892821e25d770f1fba0c47c11ff4b813e54162ece9eb839e076231ab6',
        x: '13413213784859046187686486715039706091158037999095366525547021808119004615937',
        y: '24471076613190165805373100805867147262687600132627116128986622556326754417184'
      },
      bls: {
        hex: '86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4',
        x: '1032310052213111954219872643110557886857426355660880187884944929197921151497879875809567553053909278931474809326548',
        y: '864098652078652984775100613126389130872250925668471516116602988297282146682432492413990258728259241305725439599101',
        z: '1'
      },
      isLoading: false
    };
  }

  setPrivateKey(value) {
    this.setState({isLoading: true, privateKey: value});
  }

  generateRandomPrivateKey() {
    const array = window.crypto.getRandomValues(new Uint8Array(32));
    this.setPrivateKey(arrayToHex(array));
  }

  onChange(event) {
    const {target: {validity, value}} = event;
    if (validity.valid) this.setPrivateKey(value);
  }

  async calculateKeys() {
    const priv = this.state.privateKey;
    console.log('Calculating keys');
    const privateKey = priv.replace(/^0x/, '');

    const [secpPub, edPub, blsPub] = await Promise.all([
      Promise.resolve(secp256k1.getPublicKey(privateKey, true)).then(timer('secp256k1 key')),
      ed25519.getPublicKey(privateKey).then(timer('ed25519 key')),
      Promise.resolve(bls12.getPublicKey(privateKey)).then(timer('bls key'))
    ]);
    const sp = secp256k1.Point.fromHex(secpPub);
    const ep = ed25519.Point.fromHex(edPub);
    const bp = bls12.PointG1.fromCompressedHex(blsPub);

    const pubs = {
      secp: {hex: secpPub, x: sp.x.toString(), y: sp.y.toString()},
      ed: {hex: edPub, x: ep.x.toString(), y: ep.y.toString()},
      bls: {hex: blsPub, x: bp.x.value.toString(), y: bp.y.value.toString(), z: bp.z.value.toString()},
      isLoading: false
    }
    this.setState(pubs);
    if (this.state.message) {
      this.setState({isSigning: true, message: this.state.message});
    }
  }

  onSign(event) {
    this.setState({isSigning: true, message: event.target.value.trim()});
  }

  async calculateSignatures() {
    const msg = this.state.message;
    const priv = this.state.privateKey;
    const msgb = new TextEncoder().encode(msg);
    const privateKey = priv.replace(/^0x/, '');
    const hash = arrayToHex(await ed25519.utils.sha512(msgb));
    const [secpSign, secpSchnorrSign, edSign, blsSign] = await Promise.all([
      secp256k1.sign(hash, privateKey).then(timer('secp256k1 sign')),
      secp256k1.schnorr.sign(hash, privateKey).then(timer('secp256k1 schnorr sign')),
      ed25519.sign(hash, privateKey).then(timer('ed25519 sign')),
      bls12.sign(arrayToHex(msgb), privateKey).then(timer('bls sign'))
    ]);
    this.setState({
      edSign,
      secpSign,
      secpSchnorrSign,
      blsSign,
      isSigning: false
    });
  }

  componentDidMount() {
    // this.calculateKeys();
  }

  componentDidUpdate() {
    if (this.state.isLoading) {
      setTimeout(() => {this.calculateKeys();}, 50);
    }
    if (this.state.isSigning) {
      setTimeout(() => {this.calculateSignatures();}, 50);
    }
  }

  render() {
    return <div class="ecc-calculator">
      <strong>Private key in hex: </strong>
      <input type="text" maxlength="66" value={this.state.privateKey} pattern="[\daAbBcCdDeEfFxX]{0,66}" onChange={this.onChange.bind(this)} onKeyUp={this.onChange.bind(this)} />
      <button className="gen-random-key" onClick={this.generateRandomPrivateKey.bind(this)}>Random</button>

      <h3>Public keys {this.state.isLoading && <div className="lds-hourglass"></div>}</h3>
      <ul>
        <li class="secp">
          <code>{this.state.secp.hex}</code>
          <ul>
            <li>x = <code>{this.state.secp.x}</code></li>
            <li>y = <code>{this.state.secp.y}</code></li>
          </ul>
        </li>
        <li class="ed">
          <code>{this.state.ed.hex}</code>
          <ul>
            <li>x = <code>{this.state.ed.x}</code></li>
            <li>y = <code>{this.state.ed.y}</code></li>
          </ul>
        </li>
        <li class="bls">
          <code>{this.state.bls.hex}</code>
          <ul>
            <li><small>G1 Projective coordinates</small></li>
            <li>x = <code>{this.state.bls.x}</code></li>
            <li>y = <code>{this.state.bls.y}</code></li>
            <li>z = <code>{this.state.bls.z}</code></li>
          </ul>
        </li>
      </ul>

      <div class="ecc-signatures">
        <h3>Signatures {this.state.isSigning && <div className="lds-hourglass"></div>}</h3>
        <strong>Message to sign:</strong>
        <p><textarea onChange={this.onSign.bind(this)}></textarea></p>

        <ul>
          <li class="secp"><code>{this.state.secpSign}</code></li>
          <li class="secp-schnorr"><code>{this.state.secpSchnorrSign}</code></li>
          <li class="ed"><code>{this.state.edSign}</code></li>
          <li class="bls"><code>{this.state.blsSign}</code></li>
        </ul>
      </div>
    </div>;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  React.render(<ECCCalculator />, document.querySelector('.ecc-calculator-container'));
});
