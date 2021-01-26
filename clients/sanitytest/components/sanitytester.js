class SanityTester extends Component {
  constructor(parentElement) {
    super({ className: 'client' });

    this.tests = [];
    this.visibleTest = null;

    // Tests header
    let testsHeader = createElement({ className: 'tests-header', container: this.container });
    createElement({ tagName: 'h1', textContent: 'Tests', container: testsHeader, container: testsHeader });

    // Tests body
    let testsBody = createElement({ className: 'tests-body', container: this.container });
    this.searchTests = createElement({ tagName: 'input', placeholder: 'Search tests', oninput: () => this.filterTests(), container: testsBody });
    this.testsElement = createElement({ className: 'tests', container: testsBody });

    // Results header
    let resultsHeader = createElement({ className: 'results-header', container: this.container });
    createElement({ tagName: 'h1', textContent: 'Test Results', container: resultsHeader, container: resultsHeader });
    this.unusedToggle = new Toggle('Hide Unused', 'Show Unused', () => this.filterResults(), { container: resultsHeader });
    this.warningToggle = new Toggle('Hide Warnings', 'Show Warnings', () => this.filterResults(), { container: resultsHeader });
    this.severeToggler = new Toggle('Hide Severe', 'Show Severe', () => this.filterResults(), { container: resultsHeader });
    this.errorToggler = new Toggle('Hide Errors', 'Show Errors', () => this.filterResults(), { container: resultsHeader });

    // Results body
    this.resultsBody = createElement({ className: 'results-body', container: this.container });

    // Viewer/Logger and MDL header
    let viewerLoggerMdlHeader = createElement({ className: 'viewer-and-mdl-header', container: this.container });
    let viewerLoggerMdlH1 = createElement({ tagName: 'h1', textContent: '3D View', container: viewerLoggerMdlHeader });

    // Viewer/Logger and MDL body
    let viewerLoggerMdlBody = createElement({ className: 'viewer-and-mdl-body', container: this.container });
    let viewerLogger = createElement({ className: 'viewer-and-console', container: viewerLoggerMdlBody });
    this.mdl = createElement({ className: 'mdl hidden', container: viewerLoggerMdlBody });

    // Viewer/Logger and MDL toggler
    new Toggle('View in MDL', 'View in 3D', (e) => {
      if (e.clicked) {
        viewerLoggerMdlH1.textContent = 'MDL View';

        hideElement(viewerLogger);
        showElement(this.mdl);
      } else {
        viewerLoggerMdlH1.textContent = '3D View';

        showElement(viewerLogger);
        hideElement(this.mdl);
      }
    }, { container: viewerLoggerMdlHeader });

    // Actual Viewer and Logger
    this.logger = new Logger({ container: viewerLogger });
    this.viewer = new Viewer(this, { container: viewerLogger });

    // Append at the end to avoid re-renders.
    parentElement.appendChild(this.container);
  }

  filterTests() {
    let term = this.searchTests.value.toLowerCase();

    for (let test of this.tests) {
      if (test.name.toLowerCase().includes(term)) {
        test.meta.show();
      } else {
        test.meta.hide();
      }
    }
  }

  filterResults() {
    if (this.visibleTest && this.visibleTest.results) {
      this.visibleTest.results.filter(this.unusedToggle.clicked, this.warningToggle.clicked, this.severeToggler.clicked, this.errorToggler.clicked);
    }
  }

  // pathSolver is used for API tests.
  test(name, buffer, pathSolver) {
    this.logger.info(`Parsing ${name}`);

    let test = new Test(this, name, buffer, pathSolver);

    this.tests.push(test);

    this.testsElement.appendChild(test.meta.container);
    test.meta.container.scrollIntoView();

    if (test.results) {
      this.resultsBody.appendChild(test.results.container);
    }

    if (test.mdl) {
      this.mdl.appendChild(test.mdl.container);
    }

    this.viewer.load(test);

    this.render(test);
  }

  render(test) {
    if (test !== this.visibleTest) {
      if (this.visibleTest) {
        this.visibleTest.hide();
      }

      this.visibleTest = test;
      this.filterResults();

      test.show();

      this.viewer.render(test);
    }
  }

  loadMap(name, buffer) {
    this.logger.info(`Parsing ${name}`);

    let map = new ModelViewer.default.parsers.w3x.Map();

    try {
      map.load(buffer);
    } catch (e) {
      this.logger.error(`Failed to parse ${name}`);

      return;
    }

    for (let importName of map.getImportNames()) {
      let file = map.get(importName);
      let ext = importName.substr(importName.lastIndexOf(".")).toLowerCase();

      if (ext === ".mdx") {
        this.test(`${name}:${importName}`, file.arrayBuffer());
      } else if (ext === ".mdl") {
        this.test(`${name}:${importName}`, file.text());
      } else if (ext === ".blp" || ext === ".dds" || ext === ".tga") {
        this.test(`${name}:${importName}`, file.arrayBuffer());
      }
    }
  }

  /**
   * Load a file, e.g. resulting from a Drag & Drop action.
   */
  loadFile(file) {
    let name = file.name;
    let ext = name.substr(name.lastIndexOf('.')).toLowerCase();

    if (ext === '.mdx' || ext === '.mdl' || ext === '.blp' || ext === '.dds' || ext === '.tga' || ext === '.w3x' || ext === '.w3m') {
      this.logger.info(`Reading ${name}`);

      let reader = new FileReader();

      reader.addEventListener('loadend', (e) => {
        let buffer = e.target.result;

        if (ext === '.w3m' || ext === '.w3x') {
          this.loadMap(name, buffer);
        } else {
          this.test(name, buffer);
        }
      });

      if (ext === '.mdl') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } else {
      this.logger.info(`${name} is not a supported file, skipping it`);
    }
  }

  /**
   * Used by the Hiveworkshop to test resources.
   */
  loadAPI(api) {
    let files = [];

    for (let param of api.slice(1).split('&')) {
      let [key, value] = param.split('=');

      if (value) {
        files.push(value);
      }
    }

    if (files.length) {
      // Textures get injected either way, and so this path solver isn't strictly needed.
      // With that being said, having it means not spamming viewer load errors.
      let pathSolver = (src) => {
        let a = ModelViewer.default.common.path.basename(src).toLowerCase();

        for (let file of files) {
          let b = ModelViewer.default.common.path.basename(file).toLowerCase();

          if (a === b) {
            return file;
          }
        }

        return localOrHive(src);
      };

      for (let file of files) {
        fetch(file)
          .then(async (response) => {
            let buffer;

            if (file.endsWith('.mdl')) {
              buffer = await response.text();
            } else {
              buffer = await response.arrayBuffer();
            }

            this.test(file, buffer, pathSolver);
          });
      }
    }
  }
}
